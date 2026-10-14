"""Conversational routing over approved RAG agents with source-only answers.

History resolves bounded follow-ups, never supplies facts. The optional provider
selects quotations through the same M2 interface; free-form model claims never
cross the evidence boundary.
"""
import re
from app.agents.risk_history import retrieve_risk_records
from app.agents.grounding import validate_findings
from app.agents.extraction import classify
from app.intelligence.evidence import (analyze, BROAD_FOCUS, unique_findings, reference, merge_evidence,
    cited_evidence, now, LIMITATION, safe_statement)
from app.intelligence.schemas import AssistantResult, AnswerStatement
from app.services.project_health import ProjectHealthService
from app.services.assistant_summary import concise_answer, health_answer, UNAVAILABLE

SUGGESTIONS = ['Are we on track?', 'What are our biggest risks?', 'Which tasks are blocked?',
               'What are our current deliverables?', 'Who has pending action items?', 'What is the current project health?']
STOP = set('a an the is are was were be been being do does did can could should would will shall has have had what which who whom whose how when where why we our us i me my you your they their them it its this that these those project current currently please tell show give about of on in at to for from with by and or as any all most biggest major main pending open outstanding risks risk blockers blocker blocked blocking tasks task action actions items item owner owners responsible responsibility deliverable deliverables scope goal goals objective objectives milestone milestones timeline timelines schedule scheduled deadline deadlines due date dates dependency dependencies delays delay delayed track health healthy status attention needs need causing causes cause important biggest greatest completed incomplete unresolved issues issue now based documents document evidence information more detail details explain concerning said earlier again regarding'.split())
KINDS = {
    'track': ('risk',), 'risks': ('risk',), 'dependencies': ('risk',), 'blockers': ('blockers',),
    'actions': ('blockers',), 'owners': ('scope', 'blockers'), 'deliverables': ('scope',),
    'goals': ('scope',), 'milestones': ('scope',), 'timeline': ('scope',), 'attention': ('risk', 'blockers'),
}
STOP.update({'owns', 'own', 'assigned', 'time', 'highest', 'overall', 'score', 'worst', 'priority', 'top', 'serious', 'detailed', 'comprehensive'})
CATEGORIES = {
    'track': {'schedule_risks', 'delivery_challenges', 'delivery_forecast', 'dependency_gaps'},
    'risks': {'schedule_risks', 'dependency_gaps', 'delivery_challenges', 'delivery_forecast'},
    'dependencies': {'dependency_gaps', 'schedule_risks', 'delivery_challenges'},
    'blockers': {'unresolved_issues', 'pending_decisions'}, 'actions': {'action_items'},
    'owners': {'responsibilities', 'action_items'}, 'deliverables': {'deliverables'},
    'goals': {'goals'}, 'milestones': {'milestones'}, 'timeline': {'timelines', 'milestones'},
    'attention': {'schedule_risks', 'dependency_gaps', 'delivery_challenges', 'pending_decisions', 'unresolved_issues', 'action_items'},
}
INTRO = {
    'track': 'Here is the stated schedule and delivery outlook. These passages do not establish an independent on-time delivery prediction.',
    'risks': 'These risks and delivery concerns are stated in the retrieved documents. Their relative priority is not established unless the source explicitly states severity.',
    'dependencies': 'The retrieved documents identify these dependencies and related delays.',
    'blockers': 'These blockers and unresolved decisions are stated in the retrieved documents.',
    'actions': 'These action items are supported by the retrieved evidence. Unstated owners and dates remain unknown.',
    'owners': 'These responsibilities are explicitly assigned in the retrieved documents.',
    'deliverables': 'The retrieved documents state these deliverables.',
    'goals': 'The retrieved documents state these project goals.',
    'milestones': 'The retrieved documents state these milestones.',
    'timeline': 'These dates and timelines are stated in the retrieved documents. No revised dates are inferred.',
    'attention': 'These documented concerns and pending actions need review. This list is not an inferred priority ranking.',
}


def intent(question):
    q = question.casefold()
    if re.search(r'\bhealth\b', q): return 'health'
    if re.search(r'\bon track\b|\bon time\b|delivery outlook|delivery forecast', q): return 'track'
    if re.search(r'\bdependenc|causing delays|causes?.{0,15}delay', q): return 'dependencies'
    if re.search(r'\b(?:who|owner|assigned|responsible)\b', q):
        return 'actions' if re.search(r'action|pending|task|due', q) else 'owners'
    if re.search(r'\b(?:risk|risks)\b', q): return 'risks'
    if re.search(r'\bblock(?:ed|er|ers|ing)?\b|unresolved', q): return 'blockers'
    if re.search(r'action|pending tasks|due dates', q): return 'actions'
    if re.search(r'deliverable|will.{0,12}deliver', q): return 'deliverables'
    if re.search(r'\bgoal|\bobjective|\bscope', q): return 'goals'
    if re.search(r'\bmilestone', q): return 'milestones'
    if re.search(r'\btimeline|\bdeadline|\bschedule', q): return 'timeline'
    if re.search(r'attention|project status', q): return 'attention'
    return None


def topic_words(question):
    return [w for w in re.findall(r'[a-z0-9]+', question.casefold()) if w not in STOP and len(w) > 2]


def matches_topic(quote, words):
    if not words:
        return True
    text = quote.casefold()
    # A specific subject cannot be answered with an unrelated generic project fact.
    return all(re.search(r'\b' + re.escape(word) + r'(?:s|es)?\b', text) for word in words)


def resolve_question(question, history):
    previous = next((m.content for m in reversed(history) if m.role == 'user'), None)
    followup = bool(re.search(r'\b(?:it|its|that|those|these|them|their)\b|^and\b|tell me more|more details', question, re.I))
    if not followup:
        return question, intent(question), topic_words(question), False
    if previous is None or intent(previous) is None:
        return question, None, [], True
    kind = intent(question) or intent(previous)
    # Generic plural context is safe; singular pronouns without an explicit subject
    # are ambiguous when a previous question asked about several findings.
    prior_topic = topic_words(previous)
    if re.search(r'\b(?:it|its|that)\b', question, re.I) and not prior_topic:
        return question, None, [], True
    resolved = f'{question} (project question context: {previous})'
    return resolved, kind, list(dict.fromkeys(topic_words(question) + prior_topic)), False


class ProjectAssistant:
    def __init__(self, knowledge_base, provider):
        self.kb, self.provider = knowledge_base, provider

    def run(self, question, history=()):
        resolved, kind, words, ambiguous = resolve_question(question, history)
        base = dict(query=question, question=question, resolved_question=resolved, generated_at=now(),
                    provider=self.provider.status.name, warnings=[LIMITATION, 'Conversation history helps interpret questions; only retrieved project documents provide facts.'],
                    suggested_questions=SUGGESTIONS)
        def insufficient(evidence=(), retrieved_count=0, limited=False):
            message = ('Please name the task or issue you mean so I can retrieve its evidence.' if ambiguous else
                       UNAVAILABLE)
            return AssistantResult(**base, status='insufficient_information', answer=message, grounding='insufficient_evidence',
                statements=[], evidence=list(evidence), retrieved_count=retrieved_count, evidence_limited=limited)
        if kind is None or not safe_statement(question):
            return insufficient()
        if kind == 'health':
            # The score is computed by the same service as the health page; never
            # by the provider or from a number in conversation history.
            if words:
                return insufficient()
            health = ProjectHealthService(self.kb, self.provider).run(BROAD_FOCUS)
            answer = health_answer(health)
            return AssistantResult(**base, status=health.status, answer=answer, grounding='derived_health_assessment', health=health,
                statements=[], evidence=health.evidence, retrieved_count=health.retrieved_count, evidence_limited=health.evidence_limited)
        focus = ' '.join([question, *words])[:500] if words else BROAD_FOCUS
        results = analyze(self.kb, self.provider, focus, KINDS[kind])
        findings = [f for f in unique_findings(results.values(), CATEGORIES[kind]) if matches_topic(f.quote, words)]
        if kind == 'blockers':
            # An open risk record alone is not a currently documented blocker.
            findings = [f for f in findings if re.search(r'\b(?:blockers?|blocked|blocking|unavailable|unresolved|pending decision)\b', f.quote, re.I)]
        if kind == 'owners':
            findings = [f for f in findings if f.owner is not None]
        if kind == 'dependencies':
            findings = [f for f in findings if re.search(r'depend|requires?|because|until|contract|approval|schema', f.quote, re.I)]
        evidence = merge_evidence(*(r.evidence for r in results.values()))
        register_limited = False
        if kind == 'risks':
            register_passages, records, register_limited = retrieve_risk_records(self.kb, focus)
            evidence = merge_evidence(evidence, register_passages)
            known = {f.quote for f in findings}
            raw = {'findings': [dict(category=category, evidence_id=eid, quote=q)
                                for q,eid in records if q not in known and matches_topic(q, words)
                                for category in sorted(classify(q) & CATEGORIES['risks'])[:1]]}
            findings.extend(validate_findings(raw, register_passages, 'risk'))
        limited = register_limited or any(r.evidence_limited for r in results.values()) or len(findings) > 12
        if not findings:
            return insufficient(retrieved_count=max((r.retrieved_count for r in results.values()), default=0), limited=limited)
        selected = findings if kind == 'risks' and re.search(r'\b(?:highest|biggest|greatest|worst|top|most serious)\b', question, re.I) else findings[:12]
        refs = [reference(f) for f in selected]
        answers = [AnswerStatement(category=f.category, reference=reference(f), owner=f.owner, due_date=f.due_date,
                                  source_status=f.source_status, severity=f.severity) for f in selected]
        base['warnings'].append('This assistant organizes exact source quotations. Local mode uses conservative English question patterns; it does not provide unrestricted generative chat.')
        return AssistantResult(**base, status='partial' if limited or any(f.information_state == 'unclear' for f in selected) else 'ok',
            answer=concise_answer(kind, question, findings, evidence), grounding='source_quotations', statements=answers,
            evidence=cited_evidence(refs, evidence), retrieved_count=max((r.retrieved_count for r in results.values()), default=0), evidence_limited=limited)
