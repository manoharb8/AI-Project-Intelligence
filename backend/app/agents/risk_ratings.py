"""Literal risk-register metadata, without changing M2 statements or scoring.

Probability is a source label alias for the existing likelihood field. Impact
and severity remain distinct. Only this risk's quoted statement and immediately
following rating-only statements in the SAME retrieved passage are eligible.
"""
import re
from dataclasses import dataclass
from app.agents.extraction import statements
from app.intelligence.evidence import safe_statement, known_field

RATING = re.compile(
    r'(?:^|[;.,|\n])\s*(?:(?:the|risk)\s+)?'
    r'(?P<name>probability|likelihood|impact|severity)(?:\s+(?:rating|level))?'
    r'\s*(?::|=|\bis\b)\s*', re.I)
NEXT_FIELD = re.compile(
    r'(?:[;,|\n]|\.\s+)\s*[A-Za-z][A-Za-z /_-]{0,45}\s*[:=]'
    r'|(?:[;,|\n]|\.\s+)\s*(?:(?:the|risk)\s+)?'
    r'(?:probability|likelihood|impact|severity)(?:\s+(?:rating|level))?\s+is\b', re.I)
UNKNOWN_RATING = re.compile(
    r'\b(?:not stated|not recorded|not specified|not confirmed|not defined|not assessed|'
    r'unknown|unconfirmed|unclear|unassessed|TBD|insufficient evidence)\b', re.I)
MULTIPLE_RISKS = re.compile(r'(?:^|[;.\n|])\s*(?:risk\s+(?:id|[A-Za-z]?\d+)|risk)\s*:', re.I)
WORDS = r'Critical|High|Moderate|Medium|Low|Likely|Unlikely|Major|Minor'
NATURAL_FIELDS = [
    re.compile(r'\b(?P<value>'+WORDS+r')\s+(?P<name>probability|likelihood|impact|severity)\b', re.I),
    re.compile(r'\b(?P<name>probability|likelihood|impact|severity)(?:\s+(?:rating|level))?\s+(?:is|remains|was assessed as|is assessed as|is rated)\s+(?P<value>'+WORDS+r')\b', re.I),
    re.compile(r'\b(?:making it|classified as|rated as|assessed as)\s+(?:an?\s+)?(?P<value>Critical|High|Moderate|Low)\s+(?:severity\s+)?risk\b', re.I),
    re.compile(r'\b(?:the|this)\s+risk\s+is\s+(?P<value>Likely|Unlikely)\b', re.I),
]
UNSUPPORTED = re.compile(r'\b(?:not|never|no|unknown|unconfirmed|uncertain|unassessed|unrated|if|unless|would|could|may|might|perhaps|possibly|example|hypothetical|consider|assume|suggest|propose)\b', re.I)


def _natural_fields(text):
    """Only explicit grammatical rating assignments in one safe source statement.

    No synonym is normalized and no score is inferred. Structured fields retain
    their existing literal semantics, including ambiguous/descriptive values.
    """
    if '?' in text or not safe_statement(text) or re.search(r'\b(?:if|unless|hypothetical|example|assume)\b', text, re.I):
        return
    ids = set(re.findall(r'\bR(?:ISK)?[- ]?\d+\b', text, re.I))
    if len(ids) > 1 or len(MULTIPLE_RISKS.findall(text)) > 1:
        return
    structured = []
    for match in RATING.finditer(text):
        end = NEXT_FIELD.search(text, match.end())
        structured.append((match.start(), end.start() if end else len(text)))
    for index, pattern in enumerate(NATURAL_FIELDS):
        for match in pattern.finditer(text):
            if any(start <= match.start() < end for start, end in structured):
                continue
            # Negation, alternatives and qualifications are checked locally. A
            # later, unrelated risk sentence can never donate its metadata.
            start = max(text.rfind('.', 0, match.start()), text.rfind(';', 0, match.start()), text.rfind(',', 0, match.start())) + 1
            end_match = re.search(r'[.;,]', text[match.end():])
            end = match.end() + end_match.start() if end_match else len(text)
            clause = text[start:end]
            if UNSUPPORTED.search(clause) or UNKNOWN_RATING.search(clause) or re.search(r'\b(?:or|versus)\b', clause, re.I):
                continue
            name = match.groupdict().get('name') or ('severity' if index == 2 else 'likelihood')
            name = 'likelihood' if name.lower() == 'probability' else name.lower()
            allowed = {'likelihood': {'high','moderate','medium','low','likely','unlikely'},
                       'impact': {'critical','high','moderate','medium','low','major','minor'},
                       'severity': {'critical','high','moderate','low'}}
            value = match.group('value')
            if value.lower() in allowed[name]:
                yield name, value


@dataclass
class RiskRatings:
    values: dict[str, str | None]
    supporting_quotes: list[str]
    conflicts: list[str]


def _literal_fields(text):
    """Return original value spans, not parsed scores or normalized categories."""
    for match in RATING.finditer(text):
        end = NEXT_FIELD.search(text, match.end())
        value = text[match.end():end.start() if end else len(text)].strip().rstrip('.').strip()
        # Never extract the known-looking part of an explicitly unknown value.
        value = None if not value or UNKNOWN_RATING.search(value) else known_field(value)
        name = match.group('name').lower()
        yield ('likelihood' if name == 'probability' else name), value


def _natural_continuation(text, risk_quote):
    """Accept only an adjacent rating-only sentence referring to this same risk."""
    if len(set(re.findall(r'\bR(?:ISK)?[- ]?\d+\b', risk_quote, re.I))) > 1 or len(MULTIPLE_RISKS.findall(risk_quote)) > 1:
        return False
    subjects = [r'(?:This|The) risk']
    title = re.search(r'(?:^|[;|]\s*)Risk Title:\s*([^;|]+)', risk_quote, re.I)
    if title:
        subjects.append(r'The '+re.escape(title.group(1).strip().rstrip('.'))+r' risk')
    subject = '(?:'+'|'.join(subjects)+')'
    rating = r'(?:a )?(?:'+WORDS+r')\s+(?:likelihood|probability|impact|severity)'
    assignment = subject+r' has '+rating+r'(?: and '+rating+r')*'
    conclusion = r'(?:,\s*making it (?:a )?(?:Critical|High|Moderate|Low) risk)?'
    direct = subject+r' is (?:Likely|Unlikely)'
    return bool(re.fullmatch(r'(?:'+assignment+conclusion+'|'+direct+r')\.?', text, re.I))


def extract_risk_ratings(quote: str, passage: str) -> RiskRatings:
    values: dict[str, list[str | None]] = {}
    supporting = []
    if not safe_statement(quote):
        return RiskRatings({}, [], [])
    candidates = [quote]
    units = statements(passage)
    positions = [i for i, unit in enumerate(units) if unit == quote]
    # Duplicate identical statements do not establish which following rating applies.
    if len(positions) == 1:
        for unit in units[positions[0] + 1:]:
            first = RATING.match(unit)
            if _natural_continuation(unit, quote) and safe_statement(unit):
                candidates.append(unit)
                continue
            # Stop at another risk, narrative, unrelated metadata, or instruction.
            # Never search a whole document for a free-floating matching rating.
            if not first or not safe_statement(unit) or MULTIPLE_RISKS.search(unit):
                break
            # A continuation must consist solely of explicit rating fields.
            boundaries = list(NEXT_FIELD.finditer(unit))
            if any(not RATING.match(unit, boundary.start()) for boundary in boundaries):
                break
            candidates.append(unit)
    for unit in candidates:
        if len(MULTIPLE_RISKS.findall(unit)) > 1:
            continue
        fields = [*_literal_fields(unit), *_natural_fields(unit)]
        if fields and unit != quote:
            supporting.append(unit)
        for name, value in fields:
            values.setdefault(name, []).append(value)
    resolved = {}
    conflicts = []
    for name, entries in values.items():
        distinct = {value.strip().casefold() if value is not None else None for value in entries}
        if len(distinct) > 1:
            resolved[name] = None
            conflicts.append(name)
        else:
            resolved[name] = entries[0]
    return RiskRatings(resolved, supporting, conflicts)
