"""Reject unsupported provider output before it reaches the API."""
from pydantic import ValidationError
from app.agents.schemas import AgentPayload, CATEGORIES, Finding
from app.agents.extraction import statements, classify, fields

class GroundingError(Exception):
    pass


def validate_findings(raw, evidence: list[dict], kind: str) -> list[Finding]:
    try:
        payload=AgentPayload.model_validate(raw)
    except ValidationError as exc:
        raise GroundingError('The analysis returned an invalid result structure.') from exc
    available={e['id']:e for e in evidence}
    findings=[]
    seen=set()
    for item in payload.findings:
        if item.category not in CATEGORIES[kind] or item.evidence_id not in available:
            raise GroundingError('The analysis cited unavailable evidence or an invalid category.')
        source=available[item.evidence_id]['text']
        # Full source statements only: disallow a quote cutting out a negation or
        # replacing a name even when the evidence ID itself is valid.
        if item.quote not in statements(source):
            raise GroundingError('An analysis quotation does not match a complete retrieved statement.')
        if item.category not in classify(item.quote):
            raise GroundingError('A finding category is not supported by its cited statement.')
        values=fields(item.quote,item.category)
        for key in ('owner','due_date','source_status','severity'):
            if values[key] is not None and values[key] not in item.quote:
                raise GroundingError('A structured field is not present in its source statement.')
        key=(item.category,item.evidence_id,item.quote)
        if key not in seen:
            findings.append(Finding(**item.model_dump(),**values))
            seen.add(key)
    return findings
