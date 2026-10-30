"""Deterministic evidence-health-v1; an assessment of documentation, not a forecast."""
import re
from app.agents.extraction import statements
from app.intelligence.evidence import (AGENTS, analyze, merge_evidence, unique_findings, reference,
    safe_statement, cited_evidence, now, LIMITATION)
from app.intelligence.schemas import HealthResult, HealthDimension, ScopeSignal, SourceReference

SCOPE = ('goals', 'deliverables', 'milestones', 'timelines', 'responsibilities')
NO_RISK = re.compile(r'\bno (?:current |known |open )?(?:schedule|timeline|delivery) risks?\b|\b(?:schedule|timeline) risks?\s*:\s*(?:none|0)\b', re.I)
NO_BLOCKERS = re.compile(r'\bno (?:current |known |open )?blockers?\b|\bblocker(?:s| count)?\s*:\s*(?:none|0)\b', re.I)
HEDGED = re.compile(r'\b(?:if|whether|unclear|unknown|not confirmed|unconfirmed|possibly|perhaps|may be)\b', re.I)
NOT_REVIEWED = re.compile(r'\b(?:assessed|reviewed|documented|recorded|reported|identified|mentioned|listed|confirmed)\b', re.I)
RESOLVED = re.compile(r'\b(?:is|was|has been) (?:resolved|cleared|fixed)\b|\bStatus:\s*(?:Completed|Done|Closed|Resolved)\b', re.I)
NEGATED_CONCERN = re.compile(r'\b(?:not|never) (?:delayed|blocked|behind|unavailable)|\bno (?:schedule |timeline |delivery )?(?:delay|risk|blocker)', re.I)


def explicit_zero(passages, pattern):
    refs = []
    seen = set()
    for passage in passages:
        for quote in statements(passage['text']):
            if pattern.search(quote) and not HEDGED.search(quote) and not NOT_REVIEWED.search(quote) and safe_statement(quote) and quote.casefold() not in seen:
                refs.append(SourceReference(evidence_id=passage['id'], quote=quote))
                seen.add(quote.casefold())
    return refs


def concern(finding):
    return not RESOLVED.search(finding.quote) and not NEGATED_CONCERN.search(finding.quote)


def scope_dimension(result):
    signals = []
    for category in SCOPE:
        matches = list(unique_findings([result], {category}))
        state = 'known' if any(f.information_state == 'known' for f in matches) else 'unclear' if matches else 'missing'
        points = {'known': 20, 'unclear': 10, 'missing': 0}[state]
        signals.append(ScopeSignal(category=category, state=state, points=points, references=[reference(f) for f in matches]))
    score = int(sum(s.points for s in signals)) if any(s.state != 'missing' for s in signals) else None
    return HealthDimension(id='scope_clarity', label='Scope clarity', state='assessed' if score is not None else 'insufficient_information',
        score=score, health_contribution=score, higher_is_better=True, weight=40,
        count=sum(s.state == 'known' for s in signals), scope_signals=signals,
        explanation='Five scope categories receive 20 points when explicitly established, 10 when unclear, and 0 when not retrieved. No scope evidence makes this dimension unavailable.',
        calculation=' + '.join(str(int(s.points)) for s in signals) + (f' = {score}/100' if score is not None else ' (no scope evidence)'),
        references=[r for s in signals for r in s.references])


def concern_dimension(result, passages, kind):
    timeline = kind == 'timeline_risk'
    categories = {'schedule_risks', 'delivery_challenges'} if timeline else {'unresolved_issues'}
    findings = [f for f in unique_findings([result], categories) if concern(f)]
    zero = explicit_zero(passages, NO_RISK if timeline else NO_BLOCKERS)
    refs = [reference(f) for f in findings] + zero
    state = 'conflicting_evidence' if findings and zero else 'assessed' if findings or zero else 'insufficient_information'
    score = health = count = None
    if state == 'assessed':
        count = len(findings)
        if timeline:
            penalties = [{'critical': 45, 'high': 30, 'medium': 20, 'low': 10}.get((f.severity or '').lower(), 25) for f in findings]
            score = min(100, sum(penalties))
            health = 100 - score
            calculation = f'min(100, {" + ".join(map(str, penalties)) or "0"}) = {score} risk; health contribution = 100 − {score} = {health}'
        else:
            score = health = max(0, 100 - 20 * count)
            calculation = f'max(0, 100 − 20 × {count}) = {health}/100'
    else:
        calculation = 'Not calculated: contradictory source statements require review.' if state == 'conflicting_evidence' else 'Not calculated: neither a supported concern nor an explicit zero statement was retrieved.'
    explanation = ('Each unique schedule-risk or delivery-challenge statement adds risk points: critical 45, high 30, medium 20, low 10, unstated severity 25. Risk is capped at 100; a higher risk score is worse.' if timeline else
                   'Each unique unresolved-issue or blocked-task statement reduces blocker health by 20 points. The count measures retrieved statements, not independently verified incidents.')
    explanation += ' Zero concerns requires an explicit source statement. Missing evidence never means no concerns. Conflicting zero and concern statements make the dimension unavailable.'
    return HealthDimension(id=kind, label='Timeline risk' if timeline else 'Blocker health', state=state,
        score=score, health_contribution=health, higher_is_better=not timeline, weight=35 if timeline else 25,
        count=count, explanation=explanation, calculation=calculation, references=refs)


def score_project(results, risk_passages, blocker_passages, query, provider):
    dimensions = [scope_dimension(results['scope']), concern_dimension(results['risk'], risk_passages, 'timeline_risk'),
                  concern_dimension(results['blockers'], blocker_passages, 'blocker_health')]
    complete = all(d.health_contribution is not None for d in dimensions)
    overall = int(sum(d.health_contribution * d.weight for d in dimensions) / 100 + 0.5) if complete else None
    band = 'Insufficient evidence for an overall score' if overall is None else 'Fewer documented concerns' if overall >= 75 else 'Review needed' if overall >= 45 else 'Needs attention'
    evidence = merge_evidence(*(r.evidence for r in results.values()), risk_passages, blocker_passages)
    refs = [ref for d in dimensions for ref in d.references]
    limited = any(r.evidence_limited for r in results.values())
    warnings = [LIMITATION, 'This is a transparent heuristic of retrieved project evidence, not a delivery probability, completion percentage, or independently verified assessment.',
                'Repeated wording is deduplicated; differently worded statements about the same underlying problem may still be counted separately.',
                'Dates are reported as written. No present-day lateness, revised deadline, or unstated severity is inferred.']
    if limited:
        warnings.append('A retrieval limit was reached; this assessment may omit additional evidence.')
    if any(d.state == 'conflicting_evidence' for d in dimensions):
        warnings.append('Conflicting source statements are shown together. Upload clarified current evidence and rerun; the service does not guess which statement is authoritative.')
    assessed = sum(d.state == 'assessed' for d in dimensions)
    return HealthResult(status='ok' if complete and not limited else 'partial' if assessed or refs else 'insufficient_information',
        query=query, generated_at=now(), provider=provider, evidence=cited_evidence(refs, evidence), retrieved_count=len(evidence),
        evidence_limited=limited, warnings=warnings, overall_score=overall, interpretation=band,
        assessed_dimensions=assessed, dimensions=dimensions,
        methodology='Overall = round half up(0.40 × scope clarity + 0.35 × (100 − timeline risk) + 0.25 × blocker health). All three dimensions must be assessable; weights are never silently redistributed. Bands: 75–100 fewer documented concerns; 45–74 review needed; 0–44 needs attention.')


class ProjectHealthService:
    def __init__(self, knowledge_base, provider):
        self.kb, self.provider = knowledge_base, provider

    def run(self, query):
        results = analyze(self.kb, self.provider, query)
        risk_passages, risk_limited = AGENTS['risk'](self.kb, self.provider).retrieve(query)
        blocker_passages, blocker_limited = AGENTS['blockers'](self.kb, self.provider).retrieve(query)
        result = score_project(results, risk_passages, blocker_passages, query, self.provider.status.name)
        if risk_limited or blocker_limited:
            result.evidence_limited = True
            if result.status == 'ok':
                result.status = 'partial'
        return result
