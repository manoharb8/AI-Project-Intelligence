"""Report-only projection of explicit risk fields; never scores or calls AI."""
import re
from dataclasses import dataclass, field as dc_field
from app.agents.risk_history import snapshot_date
from app.intelligence.evidence import field

UNKNOWN = re.compile(r'^(not stated|unknown|not specified|n/a)$', re.I)


def known(value):
    return value if value and value.strip() and not UNKNOWN.fullmatch(value.strip()) else None


def identity(record):
    ids = set()
    for ref in record.references:
        ids.update(m.upper() for m in re.findall(r'\bRisk\s+ID\s*:\s*([A-Za-z0-9][A-Za-z0-9_-]*)', ref.quote, re.I)
                   if m.lower() not in ('not','unknown','none','tbd'))
        text = re.sub(r'\bLinked risk:\s*R-\d+\b','',ref.quote,flags=re.I)
        ids.update(m.upper() for m in re.findall(r'\bR-\d+\b',text,re.I))
    return next(iter(ids)) if len(ids)==1 else None


@dataclass
class ReportRisk:
    source_id: str | None
    title: str
    likelihood: str | None
    impact: str | None
    severity: str | None
    status: str | None
    owner: str | None
    due: str | None
    mitigation: str | None
    references: list
    conflicts: list[str] = dc_field(default_factory=list)


def project_risks(records):
    groups={}
    for n,r in enumerate(records):
        ident=identity(r)
        groups.setdefault(('id',ident) if ident else ('observation',n),[]).append(r)
    output=[]
    for key,items in groups.items():
        dates=[]
        for item in items:
            values={snapshot_date(ref.quote) for ref in item.references}
            dates.append(next(iter(values)) if len(values)==1 else None)
        current=[r for r,d in zip(items,dates) if d==max(dates)] if all(dates) else items
        conflicts=[]
        def choose(label, values):
            unique={v.strip().casefold():v for v in values if known(v)}
            if len(unique)>1:conflicts.append(label)
            return next(iter(unique.values())) if len(unique)==1 else None
        def literal(label):
            return choose(label,[field(ref.quote,label) for item in current for ref in item.references])
        values={key:choose(key,[getattr(r,key) for r in current]) for key in ('likelihood','impact','severity','status','mitigation')}
        refs=list({(ref.evidence_id,ref.quote):ref for r in items for ref in r.references}.values())
        output.append(ReportRisk(source_id=key[1] if key[0]=='id' else None,
            title=literal('Risk Title') or field(current[0].description,'Risk Description') or current[0].title,
            owner=literal('Owner'),due=literal('Due date') or literal('Target Date'),references=refs,conflicts=conflicts,**values))
    return output


LEVELS={'probability':['Low','Moderate','High'],'impact':['Low','Moderate','High','Critical']}
WORDS={'probability':['Unlikely','Likely'],'impact':['Minor','Major']}


def axis(value,kind):
    if not value:return None
    text=value.strip()
    match=re.fullmatch(r'([1-5])\s*/\s*5(?:\s*[—–-]\s*(?:Very Low|Low|Moderate|Medium|High|Very High))?',text,re.I)
    if match:return ('score5',(int(match[1])-.5)/5)
    if re.fullmatch(r'(?:\d+(?:\.\d+)?|\.\d+)\s*%',text):
        number=float(text.rstrip('%').strip())
        if 0<=number<=100:return ('percent',number/100)
    normalized='moderate' if text.lower()=='medium' else text.lower()
    for mode,labels in [('levels',LEVELS[kind]),('words',WORDS[kind])]:
        if normalized in [v.lower() for v in labels]:return(mode,([v.lower() for v in labels].index(normalized)+.5)/len(labels))
    return None


def charts(risks):
    groups={};unpositioned=[]
    for r in risks:
        if r.source_id is None:continue
        x,y=axis(r.likelihood,'probability'),axis(r.impact,'impact')
        if x and y:groups.setdefault((x[0],y[0]),[]).append((r,x[1],y[1]))
        else:unpositioned.append(r)
    # Bounded chart pages keep labels readable even for large result sets.
    return [(modes,points[i:i+16]) for modes,points in groups.items() for i in range(0,len(points),16)],unpositioned


def ticks(mode,kind):
    if mode=='percent':return [(v/100,f'{v}%') for v in (0,25,50,75,100)]
    labels=[f'{n}/5' for n in range(1,6)] if mode=='score5' else (LEVELS if mode=='levels' else WORDS)[kind]
    return [((i+.5)/len(labels),label) for i,label in enumerate(labels)]
