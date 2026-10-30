"""Readable projection of saved workspace results, shared by PDF and Word."""
from dataclasses import dataclass, field as dc_field
from datetime import datetime, timezone
from types import SimpleNamespace
import re
from app.workspaces.schemas import WorkspaceSnapshot
from app.intelligence.evidence import field
from app.agents.risk_ratings import extract_risk_ratings
from app.exports.risks import project_risks, charts

DEFAULT_FOCUS='Review the uploaded project documents.'
LABELS={'goals':'Project goals','deliverables':'Deliverables','milestones':'Milestones','timelines':'Timelines','responsibilities':'Responsibilities',
        'schedule_risks':'Schedule risks','dependency_gaps':'Dependency gaps','delivery_challenges':'Delivery challenges','delivery_forecast':'Stated delivery outlook',
        'pending_decisions':'Pending decisions','unresolved_issues':'Unresolved issues','action_items':'Action items'}


def readable_date(value):
    try:return datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(timezone.utc).strftime('%d %b %Y, %H:%M:%S')
    except (ValueError,TypeError):return value


def display(value):
    return 'Not stated' if value is None or value=='' else str(value)


def brief(text,limit=230):
    text=' '.join(str(text).split())
    return text if len(text)<=limit else text[:limit].rsplit(' ',1)[0].rstrip(';,.')+'…'


@dataclass
class Block:
    kind: str
    text: str
    headers: list[str] = dc_field(default_factory=list)
    rows: list[list[str]] = dc_field(default_factory=list)
    payload: object = None


@dataclass
class Report:
    workspace: str
    exported_at: str
    blocks: list[Block] = dc_field(default_factory=list)
    def add(self,kind,text):self.blocks.append(Block(kind,str(text)))
    def value(self,label,value):self.add('body',f'{label}: {display(value)}')
    def table(self,headers,rows):
        if rows:self.blocks.append(Block('table','',headers,[[display(v) for v in row] for row in rows]))


def build_report(name: str,snapshot: WorkspaceSnapshot)->Report:
    report=Report(name,datetime.now(timezone.utc).isoformat())
    selected={}
    for kind in ('scope','risk','blockers','documentation','health'):
        entries=[r for r in snapshot.results if r.kind==kind]
        current=[r for r in entries if r.source_version==snapshot.source_version]
        entries=current or entries
        default=[r for r in entries if r.query==DEFAULT_FOCUS] if kind in ('documentation','health') else []
        # saved_at is authoritative; list insertion order may survive a later refresh.
        selected[kind]=max(default or entries,key=lambda r:r.saved_at) if entries else None
    evidence={};audit=[];warnings=[]
    def refs(references,result):
        tags=[]
        for ref in references:
            source=next((e for e in result.evidence if e.id==ref.evidence_id),None)
            key=(source.filename,source.location,ref.quote) if source else ('Unavailable source','Location not available',ref.quote)
            if key not in evidence:evidence[key]=f'E{len(evidence)+1}'
            tag='['+evidence[key]+']'
            if tag not in tags:tags.append(tag)
        return ' '.join(tags)
    def cite(f,result):return refs([SimpleNamespace(evidence_id=f.evidence_id,quote=f.quote)],result)
    def result(kind):return selected[kind].result if selected[kind] else None
    def status(kind):
        entry=selected[kind]
        if not entry:return
        stale=entry.source_version!=snapshot.source_version
        if stale:report.add('note','OUT OF DATE - earlier sources. Refresh this analysis before relying on it as current.')
        if entry.result.status!='ok':report.add('caption',f'Coverage: {entry.result.status.replace("_"," ")}. Findings are limited to available retrieved evidence.')
    for kind,entry in selected.items():
        if entry:
            audit.append([kind.title(),'OUT OF DATE' if entry.source_version!=snapshot.source_version else 'Current sources',entry.result.status.replace('_',' '),readable_date(entry.result.generated_at),entry.query])
            warnings.extend(entry.result.warnings)
    scope,risk,blockers,docs,health=(result(k) for k in ('scope','risk','blockers','documentation','health'))
    risk_source=docs or risk
    risk_records=list(docs.risks) if docs else []
    if not docs and risk:
        seen=set()
        for f in risk.findings:
            if f.quote in seen:continue
            seen.add(f.quote);rating=extract_risk_ratings(f.quote,next(e.text for e in risk.evidence if e.id==f.evidence_id))
            risk_records.append(SimpleNamespace(title=f.quote,description=f.quote,likelihood=rating.values.get('likelihood'),impact=rating.values.get('impact'),severity=rating.values.get('severity',f.severity),status=f.source_status,mitigation=field(f.quote,'Mitigation'),references=[SimpleNamespace(evidence_id=f.evidence_id,quote=f.quote)]))
    risks=project_risks(risk_records);identified=[r for r in risks if r.source_id];observations=[r for r in risks if not r.source_id]
    tags={id(r):refs(r.references,risk_source) for r in risks}
    goals=[f for f in scope.findings if f.category=='goals'] if scope else []
    actions=docs.action_items if docs else []
    def finding_text(f):return field(f.quote,'Risk Title') or field(f.quote,'Action item') or field(f.quote,'Task') or f.quote
    report.add('title','AI Project Intelligence & Risk Advisor')
    report.add('subtitle','Project insights and evidence report')
    report.value('Workspace',name)
    report.value('Exported at (UTC)',datetime.fromisoformat(report.exported_at).strftime('%d %b %Y, %H:%M:%S'))
    report.value('Indexed source documents',len(snapshot.indexed_sources))
    report.add('body','Purpose: project review, risk discussion and action planning using saved, evidence-grounded analysis.')
    report.add('note','Source-supported statements and derived health assessments are distinguished below. Missing information is not an all-clear. No new analysis is run during export.')
    report.add('heading','Executive summary')
    if any(entry and entry.source_version!=snapshot.source_version for entry in selected.values()):
        report.add('note','OUT OF DATE results are included and flagged in their sections. This report is not a fully current project assessment.')
    if goals:report.add('body',brief(goals[0].quote)+' '+cite(goals[0],scope))
    else:report.add('body','Project objective: Not stated in available saved scope findings.')
    report.value('Overall health score',f'{health.overall_score} / 100' if health and health.overall_score is not None else 'Insufficient evidence')
    if health:report.value('Status',health.interpretation)
    if identified:
        levels={'critical':4,'high':3,'moderate':2,'low':1}
        rated=[r for r in identified if (r.severity or '').lower() in levels]
        top=[r for r in rated if levels[r.severity.lower()]==max(levels[x.severity.lower()] for x in rated)] if rated else []
        report.add('body',f'{len(identified)} identified risks grouped by documented Risk ID; {len(observations)} additional observations. These are evidence records, not independently verified incidents.')
        if top:report.add('body','Highest stated severity among rated records: '+'; '.join(f'{r.source_id} {brief(r.title,85)} ({r.severity}) {tags[id(r)]}' for r in top[:3])+(' Further records appear in the register.' if len(top)>3 else ''))
    if blockers:
        pending=[f for f in blockers.findings if f.category in ('unresolved_issues','pending_decisions') and len(f.quote.split())>8 and not re.match(r'Goal:',f.quote,re.I)]
        for f in pending[:2]:report.add('body','Needs review: '+brief(finding_text(f),165)+' '+cite(f,blockers))
    if actions:report.add('body',f'{len(actions)} structured action records are available for review; this is not a verified open-task count.')
    report.add('note','Coverage is bounded by retrieved evidence. Partial results, missing ratings and unresolved conflicts must be reviewed against the sources. Full status, focus and limitations appear in the appendix.')

    if scope:
        report.add('heading','Project overview');status('scope')
        for category in ('goals','deliverables','milestones','timelines','responsibilities'):
            findings=[f for f in scope.findings if f.category==category]
            if findings:
                report.add('subheading',LABELS[category])
                seen=set()
                for f in findings:
                    if f.quote in seen:continue
                    seen.add(f.quote);report.add('body',brief(f.quote,300)+' '+cite(f,scope))
    if risks:
        if identified:
            report.add('heading','Risk Priority Matrix');status('documentation' if docs else 'risk')
            plots,unpositioned=charts(risks)
            report.add('body',f'{len(identified)-len(unpositioned)} of {len(identified)} identified risks have comparable stated probability and impact ratings.')
            for modes,points in plots:
                report.blocks.append(Block('chart','Probability × Impact',payload=(modes,points)))
            report.add('caption','Positions use only stated values. Low / Moderate (Medium) / High are ordered categories; Critical impact is a separate category. Likely / Unlikely and Major / Minor use their own axes. n/5 ratings use a separate ordinal 1–5 scale, not percentages. Percentages use 0–100% axes. Mixed scales are shown separately.')
            if unpositioned:
                report.add('subheading','Not positioned - rating information unavailable or not comparable')
                report.table(['Risk','Probability','Impact','Evidence'],[[r.source_id+' '+brief(r.title,100),r.likelihood,r.impact,tags[id(r)]] for r in unpositioned])
            report.add('heading','Risk register')
            report.add('caption','One row per documented Risk ID. Latest explicit dated snapshots are used only where chronology is unambiguous; all supporting snapshots remain cited. Severity is not calculated from chart position.')
            report.table(['Risk ID and title','Probability / Impact','Severity / Status','Owner / Target date'],[
                [r.source_id+'\n'+brief(r.title,105),display(r.likelihood)+'\n'+display(r.impact),display(r.severity)+'\n'+display(r.status),display(r.owner)+'\n'+display(r.due)] for r in identified])
            for r in identified:
                report.add('item',r.source_id+' '+brief(r.title,100))
                report.add('body','Mitigation / documented action: '+display(r.mitigation)+' '+tags[id(r)])
                if r.conflicts:report.add('note','Conflicting current fields remain Not stated: '+', '.join(r.conflicts)+'.')
        if observations:
            report.add('subheading' if identified else 'heading','Additional extracted observations')
            report.add('caption','These observations have no unambiguous documented Risk ID and are not included in identified-risk counts.')
            for r in observations:report.add('body',brief(r.title,260)+' '+tags[id(r)])
    if risk:
        report.add('heading','Delivery outlook');status('risk')
        seen=set()
        for category in ('schedule_risks','dependency_gaps','delivery_challenges','delivery_forecast'):
            findings=[f for f in risk.findings if f.category==category and f.quote not in seen]
            if not findings:continue
            report.add('subheading',LABELS[category])
            for quote in dict.fromkeys(f.quote for f in findings):
                matching=[f for f in findings if f.quote==quote]
                seen.add(quote);report.add('body',brief(quote,260)+' '+' '.join(dict.fromkeys(cite(f,risk) for f in matching)))
    if blockers or actions:
        report.add('heading','Blockers and action items');status('blockers')
        if blockers:
            rows=[];seen=set()
            for f in blockers.findings:
                if f.category=='action_items' and actions:continue
                if f.quote in seen:continue
                seen.add(f.quote)
                if len(f.quote.split())<=8 or re.match(r'Goal:',f.quote,re.I):
                    cite(f,blockers) # Preserve short/ambiguous source observations in the appendix.
                    continue
                rows.append([brief(f.quote,190),display(f.source_status),display(f.owner or field(f.quote,'Owner'))+'\n'+display(f.due_date or field(f.quote,'Due date')),cite(f,blockers)])
            report.table(['Extracted issue or decision','Status','Owner / Due date','Evidence'],rows)
        if actions:
            report.add('subheading','Documented actions')
            report.table(['Action','Owner / Due date','Status / Dependency','Evidence'],[
                [brief(field(a.description,'Action item') or field(a.description,'Task') or a.title,180),display(a.owner)+'\n'+display(a.due_date),display(a.status)+'\n'+display(a.dependency),refs(a.references,docs)] for a in actions])
    if health:
        report.add('heading','Project health');status('health')
        report.value('Overall health score',f'{health.overall_score} / 100' if health.overall_score is not None else 'Insufficient evidence')
        report.value('Interpretation',health.interpretation)
        report.table(['Dimension','Score / Direction','Weight','State'],[[d.label,(f'{d.score} / 100' if d.score is not None else 'Insufficient evidence')+'\n'+('Higher = better' if d.higher_is_better else 'Higher timeline risk = more risk'),f'{d.weight}%',d.state.replace('_',' ')] for d in health.dimensions])
        report.add('subheading','Why this score')
        report.add('body',health.methodology)
        for d in health.dimensions:
            report.add('item',d.label)
            report.value('Score',f'{d.score} / 100' if d.score is not None else 'Insufficient evidence')
            report.add('body',d.explanation)
            report.add('body',d.calculation+' '+refs(d.references,health))
            if d.scope_signals:report.table(['Scope category','Evidence state','Points','Evidence'],[[LABELS.get(s.category,s.category),s.state,str(s.points),refs(s.references,health)] for s in d.scope_signals])
        report.value('Methodology version',health.methodology_version)
    if docs and docs.user_stories:
        report.add('heading','Documentation and requirements');status('documentation')
        for n,s in enumerate(docs.user_stories,1):
            report.add('subheading',f'User story {n}: '+brief(s.title,100))
            report.value('Role / user',s.role);report.value('Need / action',s.need);report.value('Benefit / value',s.benefit)
            report.value('Acceptance criteria','\n'.join(s.acceptance_criteria) or None)
            report.add('caption',f'Information state: {s.information_state}. '+refs(s.references,docs))

    # Only the two saved automatic briefing questions; never include private follow-up chat.
    for question in ('Are we on track?','What is blocking the project?'):
        entries=[r for r in snapshot.results if r.kind=='assistant' and not r.history and r.query==question]
        current=[r for r in entries if r.source_version==snapshot.source_version]
        if entries:
            entry=max(current or entries,key=lambda r:r.saved_at);answer=entry.result
            audit.append(['Briefing', 'Current sources' if current else 'OUT OF DATE',answer.status,readable_date(answer.generated_at),question])
            # Existing precise quotations are retained, without repeating the answer narrative.
            for s in answer.statements:refs([s.reference],answer)
    report.add('heading','Evidence and appendix')
    missing=[k for k,v in selected.items() if not v]
    if missing:report.add('note','No saved result is available for: '+', '.join(missing)+'. Insufficient evidence / Not generated; no values have been assumed.')
    report.add('subheading','Analysis provenance and limitations')
    report.table(['Analysis','Freshness / Coverage','Generated at (UTC)'],[[a[0],a[1]+'\n'+a[2],a[3]] for a in audit])
    for label,fresh,coverage,date,focus in audit:
        if focus!=DEFAULT_FOCUS:report.add('caption',f'{label} focus: {focus}')
    for warning in dict.fromkeys(warnings):report.add('note',warning)
    report.add('subheading','Source evidence')
    report.add('caption','References identify the source file and recorded location. Quotations are preserved verbatim once per source location; historical snapshots are included when cited. Ellipses in main-section summaries indicate shortened text; consult the full quotation here.')
    for (filename,location,quote),tag in evidence.items():
        report.add('item',f'[{tag}] {filename} | {location}')
        report.add('quote',quote)
    if not evidence:report.add('body','Insufficient evidence. No saved source references are available.')
    return report
