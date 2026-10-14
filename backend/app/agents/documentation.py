"""Grounded documentation assembled from M2 analysis and explicit requirements.

The configured provider selects M2 statements. All documentation fields are
server-derived literal spans, including the local no-key path.
"""
import re
from types import SimpleNamespace
from app.agents.risk_history import retrieve_risk_records
from app.agents.extraction import statements
from app.agents.risk_ratings import extract_risk_ratings
from app.intelligence.evidence import (StoryRetrieval, analyze, merge_evidence, field,
    reference, unique_findings, item_id, safe_statement, known_field, cited_evidence, now, LIMITATION)
from app.intelligence.schemas import (DocumentationResult, UserStory, RiskEntry, ActionItem, SourceReference)


def story_from_statement(quote, evidence_id):
    if not safe_statement(quote):
        return None
    # Only explicitly written roles, needs and benefits are filled. Requirements
    # without an actor can form a partial story; never assume an end-user role.
    role = benefit = need = None
    match = re.search(r'\bAs (?:an? )?(.+?),\s*I (?:want|need|would like)\s+(.+?)(?:,?\s+so that\s+(.+?))?(?:[.!?]|$)', quote, re.I)
    if match:
        role, need, benefit = match.groups()
    else:
        match = re.search(r'\bwill (?:let|allow|enable)\s+(.+?)\s+(?:to\s+)?((?:submit|track|create|view|manage|access|review|export|upload|search|receive|update|approve|download)\b[^.!?]+)', quote, re.I)
        if match:
            role, need = match.groups()
        else:
            match = re.search(r'\b(?:goal|objective)\s*(?:is to|is|:|to)\s*([^.!?]+)', quote, re.I)
            if match:
                need = match.group(1)
    if need is None:
        return None
    role, need, benefit = (known_field(re.split(r';\s*Acceptance criteri(?:a|on):', x, flags=re.I)[0].strip()) if x else None for x in (role, need, benefit))
    if need is None:
        return None
    # A criterion must be explicitly labelled in this SAME requirement statement.
    criterion = field(quote, 'Acceptance criteria') or field(quote, 'Acceptance criterion')
    criteria = [criterion] if criterion else []
    for value in [role, need, benefit, *criteria]:
        if value is not None and value not in quote:
            return None
    return UserStory(id=item_id('story', quote), title=need, role=role, need=need, benefit=benefit,
                     acceptance_criteria=criteria, information_state='explicit' if role and benefit and criteria else 'partial',
                     references=[SourceReference(evidence_id=evidence_id, quote=quote)])


class DocumentationAgent:
    def __init__(self, knowledge_base, provider):
        self.kb, self.provider = knowledge_base, provider

    def run(self, query):
        results = analyze(self.kb, self.provider, query)
        passages, limited = StoryRetrieval(self.kb, self.provider).retrieve(query)
        register_passages, register_records, register_limited = retrieve_risk_records(self.kb, query)
        limited = limited or register_limited
        evidence = merge_evidence(register_passages, passages, *(r.evidence for r in results.values()))
        stories = []
        seen = set()
        for passage in evidence:
            for quote in statements(passage['text']):
                story = story_from_statement(quote, passage['id'])
                if story and story.id not in seen:
                    seen.add(story.id)
                    stories.append(story)
        risks = []
        rating_warnings = []
        sources = {entry['id']: entry['text'] for entry in evidence}
        risk_findings = list(unique_findings([results['risk']]))
        seen_quotes = {f.quote for f in risk_findings}
        for quote, evidence_id in register_records:
            if quote not in seen_quotes:
                risk_findings.append(SimpleNamespace(quote=quote, evidence_id=evidence_id, severity=None))
                seen_quotes.add(quote)
        for finding in risk_findings:
            categories = sorted({f.category for f in results['risk'].findings if f.quote == finding.quote})
            quote = finding.quote
            ratings = extract_risk_ratings(quote, sources.get(finding.evidence_id, quote))
            risk_refs = [reference(finding), *[SourceReference(evidence_id=finding.evidence_id, quote=text)
                                             for text in ratings.supporting_quotes]]
            if ratings.conflicts:
                rating_warnings.append(f"{item_id('risk', quote)}: conflicting explicit {' / '.join(ratings.conflicts)} values remain Not stated. Review the cited statements.")
            risks.append(RiskEntry(id=item_id('risk', quote), title=quote, description=quote, categories=categories,
                impact=ratings.values.get('impact', field(quote, 'Impact')),
                likelihood=ratings.values.get('likelihood', field(quote, 'Likelihood')), status=field(quote, 'Status'),
                mitigation=field(quote, 'Mitigation') or field(quote, 'Recommended action'),
                severity=ratings.values.get('severity', known_field(finding.severity)), references=risk_refs))
        actions = []
        for finding in unique_findings([results['blockers']], {'action_items'}):
            quote = finding.quote
            # These values remain M2-derived, with explicit unknown markers normalized.
            actions.append(ActionItem(id=item_id('action', quote), title=field(quote, 'Task') or quote, description=quote,
                owner=known_field(finding.owner), due_date=known_field(finding.due_date), status=known_field(finding.source_status),
                dependency=field(quote, 'Dependency'), references=[reference(finding)]))
        refs = [ref for item in [*stories, *risks, *actions] for ref in item.references]
        used = cited_evidence(refs, evidence)
        warnings = [LIMITATION, 'Unknown fields are null in the API and shown as Not stated. No acceptance criteria, mitigation, or commitments are inferred.',
                    'User stories are structured drafts of explicit requirements, not newly invented requirements. Review partial stories before adoption.']
        warnings.extend(rating_warnings)
        if self.provider.status.mode == 'extractive':
            warnings.append('Local mode uses conservative English extraction rules and may miss indirect wording.')
        limited = limited or any(r.evidence_limited for r in results.values())
        if limited:
            warnings.append('The retrieval budget was reached. Use a narrower focus to review further evidence.')
        incomplete = any(s.information_state == 'partial' for s in stories) or any(
            a.owner is None or a.due_date is None or a.status is None for a in actions) or any(
            r.impact is None or r.likelihood is None or r.status is None or r.mitigation is None for r in risks)
        return DocumentationResult(status='insufficient_information' if not refs else 'partial' if limited or incomplete or not all((stories, risks, actions)) else 'ok',
            query=query, generated_at=now(), provider=self.provider.status.name, evidence=used,
            retrieved_count=len(evidence), evidence_limited=limited, warnings=warnings,
            user_stories=stories, risks=risks, action_items=actions)
