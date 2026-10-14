"""Select explicit dated risk snapshots without using upload order as chronology."""
import re
from datetime import date


def snapshot_date(quote):
    matches = set(re.findall(r'(?:^|;)\s*As of:\s*(\d{4}-\d{2}-\d{2})(?=[;.]|$)', quote, re.I))
    if len(matches) != 1:
        return None
    try:
        return date.fromisoformat(next(iter(matches)))
    except ValueError:
        return None


def current_risk_findings(findings):
    """Undated or same-date contradictions stay eligible for conflict detection.

    Only records with one explicit Risk ID and a valid As of date can supersede
    one another. Calling code retains full evidence for historical inspection.
    """
    groups = {}
    keys = []
    for finding in findings:
        ids = set(re.findall(r'\bRisk ID:\s*([A-Za-z0-9][A-Za-z0-9_-]*)', finding.quote, re.I))
        key = next(iter(ids)).upper() if len(ids) == 1 else None
        keys.append(key)
        if key:
            groups.setdefault(key, []).append(snapshot_date(finding.quote))
    latest = {key: max(dates) for key, dates in groups.items() if all(d is not None for d in dates)}
    return [finding for finding, key in zip(findings, keys)
            if key not in latest or snapshot_date(finding.quote) == latest[key]]


def retrieve_risk_records(kb, focus):
    """Bounded semantic retrieval of explicit register records, using the existing KB.

    Never load the entire collection or infer records from unlabelled concerns.
    The limit is reported; this is not an exhaustive project audit.
    """
    from app.agents.extraction import statements
    from app.intelligence.evidence import safe_statement
    hits = kb.query(f'{focus} Risk ID Risk Title Probability Impact Severity Status Owner Mitigation', top_k=30)['results']
    passages, records = [], []
    for hit in hits:
        found = [quote for quote in statements(hit['text']) if safe_statement(quote)
                 and len(set(re.findall(r'\bRisk ID:\s*([A-Za-z0-9][A-Za-z0-9_-]*)', quote, re.I))) == 1
                 and re.search(r'(?:^|;)\s*Risk Title:', quote, re.I)]
        if found:
            passages.append(hit)
            records.extend((quote,hit['id']) for quote in found)
    return passages, records, len(hits) == 30
