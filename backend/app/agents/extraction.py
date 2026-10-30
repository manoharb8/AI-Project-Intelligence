"""Conservative, inspectable rules for the no-key demo and field grounding.

This is an extractive baseline, not generative AI. Rules operate on actual
retrieved statements. No sample filenames, fixture identities, or canned findings.
"""
import re

DATE = r'(?:\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b)'
ABSENT = re.compile(r'\b(?:unknown|not recorded|not specified|not confirmed|unconfirmed|unclear|TBD|unassigned|not assigned|no revised delivery date is confirmed|not defined)\b', re.I)
NEGATED = re.compile(r'\b(?:no (?:current |known |open )?(?:schedule risks?|risks?|blockers?|unresolved issues?|pending decisions?|dependency gaps?)|(?:risk|blocker|issue) (?:has been |is )?resolved)\b', re.I)
INSTRUCTION = re.compile(r'ignore (?:all |previous |the )?instructions|system prompt|evidence_id|assistant:|invent (?:an? |the )?(?:owner|date)|return (?:the following )?json', re.I)


def statements(text: str) -> list[str]:
    # A CSV extraction unit is a whole header/value row; keep fields associated.
    if re.search(r'(?:^|; )\w[\w ]*:', text) and '; Owner:' in text:
        return [text] if len(text) <= 2500 else []
    parts=[s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    combined=[]
    for part in parts:
        if combined and re.match(r'(?:Status|Owner|Due date|Severity):',part,re.I):
            combined[-1]+=' '+part
        else:
            combined.append(part)
    return [s for s in combined if 3 <= len(s) <= 2500]


def classify(text: str) -> set[str]:
    if INSTRUCTION.search(text) or NEGATED.search(text):
        return set()
    kinds = set()
    def has(pattern): return bool(re.search(pattern, text, re.I))
    if has(r'\b(?:goals?|objectives?|aims?)\s*(?:is|are|:|to)'):
        kinds.add('goals')
    if has(r'\bmilestones?\s*:|\bmilestone\b[^.!?]*(?:scheduled|due|target date)'):
        kinds.add('milestones')
    if has(r'\b(?:timeline|deadline|due date|target date)\s*:|\bmilestones?\s*:') and (re.search(DATE,text,re.I) or ABSENT.search(text)):
        kinds.add('timelines')
    if has(r'\b(?:owns?|responsible for|assigned to)\b|(?:^|; )Owner:\s*\S'):
        kinds.add('responsibilities')
    if has(r'\bdeliverables?\s*(?:include|are|:)|\bwill deliver\b'):
        kinds.add('deliverables')
    if has(r'\bschedule risks?\b|behind (?:plan|schedule)|\b(?:delay|delayed|delays|slippage)\b|deadline (?:is )?at risk'):
        kinds.add('schedule_risks')
    if has(r'\b(?:depend\w*|requires?|contract|approval)\b') and has(r'\b(?:gap|missing|pending|unavailable|unapproved|not approved|not been approved|not ready|blocked)\b'):
        kinds.add('dependency_gaps')
    if has(r'delivery challenge|\b(?:threatens|jeopardizes|cannot start|cannot proceed|cannot deliver|blocked)\b'):
        kinds.add('delivery_challenges')
    if has(r'(?:delivery|completion) (?:forecast|date)|\b(?:forecast|expected delivery|projected completion)\b|(?:threatens|jeopardizes)[^.!?]*milestone'):
        kinds.add('delivery_forecast')
    if has(r'pending decision|decision[^.!?]*(?:pending|unresolved|not approved)|has not approved|awaiting (?:a )?decision'):
        kinds.add('pending_decisions')
    if has(r'\b(?:blockers?|unresolved|unavailable|missing|blocked)\b|(?:^|; )Status:\s*Open\b|\| Open\b'):
        kinds.add('unresolved_issues')
    if has(r'\baction items?\s*:|\bassigned action\b|(?:^|; )Task:\s*'):
        if not has(r'(?:^|; )Status:\s*(?:Completed|Done|Closed)\b'):
            kinds.add('action_items')
    return kinds


def labelled(text: str, label: str):
    match = re.search(r'(?:^|[;.]\s*)'+label+r':\s*(.*?)(?=;\s*[A-Za-z][A-Za-z ]*:|[.]\s*(?:Status|Owner|Due date|Severity):|$)', text, re.I)
    if not match:
        return None
    value = match.group(1).strip().rstrip('.')
    return None if not value or ABSENT.search(value) else value


def fields(text: str, category: str) -> dict:
    dates = list(dict.fromkeys(re.findall(DATE, text, re.I)))
    owner = labelled(text, 'Owner')
    if owner is None and category in ('action_items','responsibilities'):
        # Require an explicit grammatical assignment, preserving the source spelling.
        pattern=r'\b([A-Z][a-z]+(?: [A-Z][a-z]+){0,2}) (?:owns?|is responsible for|will)\b'
        match=re.search(pattern,text)
        if match and match.group(1) not in ('The','This','It','Project'):
            owner=match.group(1)
    if owner is not None and category not in ('action_items','responsibilities'):
        owner=None
    due_date=None
    if category in ('action_items','milestones','timelines'):
        raw=labelled(text,'Due date') or labelled(text,'Deadline') or labelled(text,'Target date')
        match=re.search(r'\b(?:by|due on|due|deadline is)\s+('+DATE+r')',text,re.I)
        due_date=raw or (match.group(1) if match else None)
    status=labelled(text,'Status')
    severity=labelled(text,'Severity')
    if severity is None:
        match=re.search(r'\bSeverity:\s*(critical|high|medium|low)\b',text,re.I)
        severity=match.group(1) if match else None
    unclear=bool(ABSENT.search(text)) or (category=='action_items' and (owner is None or due_date is None))
    return dict(owner=owner,due_date=due_date,dates=dates,source_status=status,severity=severity,
                information_state='unclear' if unclear else 'known')
