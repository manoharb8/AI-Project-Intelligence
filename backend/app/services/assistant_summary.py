"""Concise presentation of validated findings; never creates project facts."""
import re
from app.agents.risk_history import current_risk_findings
from app.agents.risk_ratings import extract_risk_ratings
from app.intelligence.evidence import field

UNAVAILABLE = 'This information is not available in the uploaded documents.'
ORDER = {'critical': 4, 'high': 3, 'moderate': 2, 'medium': 2, 'low': 1}


def short(text, limit=190):
    text = ' '.join(text.split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(' ', 1)[0].rstrip(' ,;') + '…'


def title(quote):
    return field(quote, 'Risk Title') or field(quote, 'Task') or short(re.split(r'; (?:Owner|Action item):', quote, maxsplit=1)[0])


def health_answer(health):
    if health.overall_score is None:
        return UNAVAILABLE
    dimensions = [d for d in health.dimensions if d.health_contribution is not None]
    weakest = max(dimensions, key=lambda d: (100-d.health_contribution)*d.weight, default=None)
    concern = (f'{weakest.label}: {weakest.score}/100 (largest weighted reduction).' if weakest and weakest.health_contribution < 100
               else 'No reduction in the assessed dimensions; this is not an all-clear.')
    return f'- Project Health: {health.overall_score}/100\n- Status: {health.interpretation}\n- Main concern: {concern}'


def concise_answer(kind, question, findings, evidence):
    detailed = bool(re.search(r'\b(?:detail(?:ed|s)?|comprehensive|all findings|full explanation)\b', question, re.I))
    highest = kind == 'risks' and bool(re.search(r'\b(?:highest|biggest|greatest|worst|top|most serious)\b', question, re.I))
    if highest:
        passages = {e['id']: e['text'] for e in evidence}
        grouped = {}
        for finding in current_risk_findings(findings):
            q = finding.quote
            if re.search(r'(?:Status:\s*(?:Closed|Resolved|Completed)|\bis resolved\b)', q, re.I):
                continue
            ids = set(re.findall(r'\bRisk ID:\s*(R-\d+)\b', q, re.I))
            # A statement naming multiple risks cannot assign one risk's rating.
            if len(ids) > 1:
                continue
            key = next(iter(ids)).upper() if ids else q.casefold()
            ratings = extract_risk_ratings(q, passages.get(finding.evidence_id, q))
            severity = ratings.values.get('severity', finding.severity)
            entry = grouped.setdefault(key, {'findings': [], 'ratings': set(), 'conflict': False})
            entry['findings'].append(finding)
            if 'severity' in ratings.conflicts:
                entry['conflict'] = True
            if severity:
                entry['ratings'].add(severity.strip().lower())
        rated = [g for g in grouped.values() if not g['conflict'] and len(g['ratings']) == 1 and next(iter(g['ratings'])) in ORDER]
        if not rated:
            return '- Highest risk: Not established by the retrieved evidence.\n- ' + UNAVAILABLE
        peak = max(ORDER[next(iter(g['ratings']))] for g in rated)
        winners = [g for g in rated if ORDER[next(iter(g['ratings']))] == peak]
        labels = []
        for g in winners:
            quote = g['findings'][0].quote
            risk_id = re.search(r'\bRisk ID:\s*(R-\d+)\b', quote, re.I)
            label = (risk_id.group(1) + ': ' if risk_id else '') + title(quote)
            if label not in labels: labels.append(label)
        level = next(iter(winners[0]['ratings'])).title()
        lines = [f'Highest stated severity: {level}' + (' (tie among retrieved risks).' if len(winners)>1 else ' among retrieved risks.'),
                 'Risk' + ('s' if len(labels)>1 else '') + ': ' + short(' / '.join(labels), 240)]
        # Actions must be literal fields of the same winning risk's statements.
        actions = list(dict.fromkeys(a for g in winners for f in g['findings'] if (a := field(f.quote, 'Mitigation') or field(f.quote, 'Recommended action'))))
        lines.append('Recommended action: ' + (short(' / '.join(actions), 220) if actions else 'Not stated.'))
        if len(rated) != len(grouped):
            lines.append('Some other risks have missing or conflicting severity; an overall ranking is not established.')
        if detailed:
            lines.extend(short(f.quote, 450) for g in winners for f in g['findings'])
        return '\n'.join('- '+line for line in lines)
    selected = findings[:12 if detailed else 3]
    lines=[]
    for f in selected:
        label=title(f.quote)
        # Only exact, same-statement metadata is eligible for compact facts.
        owner = f.owner or field(f.quote, 'Owner')
        action = field(f.quote, 'Next action') or field(f.quote, 'Action item')
        if kind in ('blockers','actions','owners'):
            if owner and owner not in label: label += f' · Owner: {owner}'
            if action: label += f' · Next action: {short(action,100)}'
        lines.append(short(label, 340 if detailed else 240))
    if len(findings)>len(selected):lines.append('More supported findings are available under View source.')
    return '\n'.join('- '+line for line in lines)
