"""Compose the approved M2 agents; never create another retrieval system."""
import hashlib
import re
from datetime import datetime, timezone
from app.agents.base import GroundedAgent
from app.agents.scope_deliverables import ScopeDeliverablesAgent
from app.agents.risk_forecast import RiskForecastAgent
from app.agents.blockers_actions import BlockersActionsAgent
from app.agents.extraction import INSTRUCTION, statements, labelled
from app.agents.grounding import GroundingError
from app.intelligence.schemas import SourceReference

AGENTS = {'scope': ScopeDeliverablesAgent, 'risk': RiskForecastAgent, 'blockers': BlockersActionsAgent}
BROAD_FOCUS = 'Review the uploaded project documents.'
LIMITATION = 'Assessment covers bounded retrieved evidence, not an exhaustive audit of every document or real-world project status.'
EXTRA_INSTRUCTION = re.compile(r'ignore\b.{0,45}\b(?:rules|instructions)|(?:system|developer)\s*(?:message|prompt)|(?:reveal|print|exfiltrate).{0,30}(?:secret|api.?key)|(?:override|disregard).{0,35}(?:instruction|evidence)', re.I)
UNKNOWN = re.compile(r'^(?:not stated|not recorded|not specified|unknown|unassigned|none|n/?a|tbd|not confirmed)$', re.I)


def now():
    return datetime.now(timezone.utc).isoformat()


def safe_statement(text):
    return not (INSTRUCTION.search(text) or EXTRA_INSTRUCTION.search(text))


def known_field(value):
    return None if value is None or UNKNOWN.fullmatch(value.strip()) else value


def field(text, name):
    return known_field(labelled(text, name))


def reference(finding):
    return SourceReference(evidence_id=finding.evidence_id, quote=finding.quote)


def unique_findings(results, categories=None):
    seen = set()
    for result in results:
        for finding in result.findings:
            if categories is not None and finding.category not in categories:
                continue
            if not safe_statement(finding.quote):
                continue
            key = finding.quote.casefold().strip()
            if key not in seen:
                seen.add(key)
                yield finding


def item_id(kind, quote):
    return kind + '-' + hashlib.sha256(quote.strip().casefold().encode()).hexdigest()[:12]


def verify_references(refs, evidence):
    available = {e['id']: e for e in evidence}
    for ref in refs:
        if ref.evidence_id not in available or ref.quote not in statements(available[ref.evidence_id]['text']) or not safe_statement(ref.quote):
            raise GroundingError('A Milestone 3 output could not be traced to a complete retrieved statement.')


def cited_evidence(refs, evidence):
    refs = list(refs)
    verify_references(refs, evidence)
    ids = {r.evidence_id for r in refs}
    return [e for e in evidence if e['id'] in ids]


def merge_evidence(*groups):
    found = {}
    for group in groups:
        for entry in group:
            item = entry.model_dump() if hasattr(entry, 'model_dump') else entry
            found.setdefault(item['id'], item)
    return list(found.values())


class StoryRetrieval(GroundedAgent):
    retrieval_queries = ('user stories user requirements role need benefit acceptance criteria',
                         'customers users portal will let allow submit track', 'project goal deliverables')


def analyze(kb, provider, focus, kinds=('scope', 'risk', 'blockers')):
    return {kind: AGENTS[kind](kb, provider).run(focus) for kind in kinds}
