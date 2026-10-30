import {ExpandableText, PreviewList} from '../components/ExpandableText';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {Activity, ArrowUpRight, BookOpen, CircleHelp, ListChecks, RefreshCw, ShieldCheck, Target, TriangleAlert} from 'lucide-react';
import {Busy, ErrorNotice, Notice} from '../components/UI';
import {useIntelligence} from './IntelligenceContext';
import {MethodNotes, ResultStamp, SourceQuotes, UnknownValue, useAvailability} from './Shared';
import {categoryLabels} from '../agentSpecs';
import type {AssistantResult} from './types';
import {VisualSummary} from './VisualSummary';

function BriefingItems({children}: {children: ReactNode[]}) {
  return <PreviewList count={2}>{children}</PreviewList>;
}

function Statements({result}: {result: AssistantResult | null}) {
  if (!result) return <p className="muted">Waiting for supported source statements.</p>;
  return <><ExpandableText text={result.answer} limit={220}/><details className="briefing-expanded"><summary>View supporting findings & sources</summary><BriefingItems>{result.statements.map((item, index) => <article className="briefing-statement" key={`${item.reference.evidence_id}-${index}`}><span className="answer-category">{categoryLabels[item.category] ?? item.category}</span><ExpandableText text={item.reference.quote}/>{item.severity && <p>Stated severity: {item.severity}</p>}<SourceQuotes references={[item.reference]} evidence={result.evidence}/></article>)}</BriefingItems><ResultStamp result={result} label="Prepared"/><MethodNotes warnings={result.warnings}/></details></>;
}

export default function ProjectBriefing() {
  const {briefing, setDocTab} = useIntelligence();
  const unavailable = useAvailability();
  const jobs = [
    {name: 'Documentation', work: briefing.documentation},
    {name: 'Health', work: briefing.health},
    {name: 'Delivery outlook', work: briefing.outlook},
    {name: 'Blockers', work: briefing.blockers},
  ];
  const busy = jobs.some(({work}) => work.busy || work.waiting);
  const hasResult = jobs.some(({work}) => work.result);
  const stale = jobs.some(({work}) => work.stale);
  const docs = briefing.documentation.result;
  const health = briefing.health.result;
  const scope = health?.dimensions.find(item => item.id === 'scope_clarity');
  const missing: string[] = [];
  scope?.scope_signals.filter(signal => signal.state !== 'known').forEach(signal => missing.push(`${categoryLabels[signal.category] ?? signal.category}: ${signal.state === 'missing' ? 'not established' : 'unclear'} in retrieved evidence.`));
  health?.dimensions.filter(dimension => dimension.score === null).forEach(dimension => missing.push(`${dimension.label}: ${dimension.explanation}`));
  if (docs) {
    const owners = docs.action_items.filter(item => item.owner === null).length;
    const dates = docs.action_items.filter(item => item.due_date === null).length;
    if (owners) missing.push(`${owners} documented action ${owners === 1 ? 'entry has' : 'entries have'} no stated owner.`);
    if (dates) missing.push(`${dates} documented action ${dates === 1 ? 'entry has' : 'entries have'} no stated due date.`);
    const likelihoods = docs.risks.filter(item => item.likelihood === null).length;
    if (likelihoods) missing.push(`${likelihoods} risk entries have no stated likelihood; no probabilities are inferred.`);
    if (docs.user_stories.some(item => item.information_state === 'partial')) missing.push('Some user stories are partial; unstated roles, value and acceptance criteria remain unknown.');
  }
  for (const job of jobs) {
    if (!job.work.result) missing.push(`${job.name}: results are ${job.work.busy || job.work.waiting ? 'still being prepared' : 'unavailable'}.`);
    if (job.work.result?.evidence_limited) missing.push(`${job.name}: the result covers a limited selection of retrieved evidence.`);
    if (job.work.result?.status === 'insufficient_information') missing.push(`${job.name}: available evidence is insufficient.`);
  }
  return <section className="project-briefing" aria-labelledby="briefing-title">
    <header className="briefing-hero"><div><p className="briefing-kicker"><ShieldCheck size={16}/>AUTOMATIC · SOURCE-GROUNDED</p><h2 id="briefing-title">Your Project Briefing</h2><p>What the documents establish. What needs review. Where the evidence stops.</p><details className="briefing-method"><summary>How this briefing is prepared</summary><p>Prepared from the same knowledge base and existing analysis services. These services rerun analysis when fresh results are needed.</p></details></div><button className="button" disabled={Boolean(unavailable) || busy} onClick={() => jobs.forEach(({work}) => void work.refresh())}><RefreshCw size={16}/>Refresh briefing</button></header>
    {busy && <Busy>Preparing your project briefing from indexed evidence… {hasResult && 'Previous results remain visible while sections refresh.'}</Busy>}
    {stale && <Notice tone="warning">Some briefing sections use earlier sources. They remain visible while current evidence is reviewed.</Notice>}
    {jobs.filter(({work}) => work.error).map(({name, work}) => <ErrorNotice key={name}><p>{name}: {work.error}</p><p>Any previous result is retained. Other briefing sections remain available.</p><button className="button secondary notice-action" disabled={Boolean(unavailable) || work.busy} onClick={() => void work.refresh()}>Retry {name.toLowerCase()}</button></ErrorNotice>)}
    {!hasResult && !busy && <Notice>{unavailable || 'The briefing could not be prepared. Use the retry controls above.'}</Notice>}
    {hasResult && <>
      <nav className="briefing-index" aria-label="Briefing sections"><a href="#briefing-scope">Scope</a><a href="#briefing-outlook">Delivery</a><a href="#briefing-risks">Risks</a><a href="#briefing-blockers">Blockers</a><a href="#briefing-actions">Actions</a><a href="#briefing-gaps">Evidence gaps</a><a href="#briefing-visual-summary">Visual summary</a></nav>
      <div className="briefing-grid">
        <section className="briefing-panel" id="briefing-scope"><h3><Target size={19}/>Scope & deliverables</h3>{scope ? <>{scope.scope_signals.map(signal => <div className="briefing-scope-row" key={signal.category}><strong>{categoryLabels[signal.category] ?? signal.category}</strong><span className={`signal-state ${signal.state}`}>{signal.state === 'known' ? 'Established' : signal.state === 'unclear' ? 'Unclear' : 'Not established'}</span>{signal.references.slice(0,1).map((reference, index) => <ExpandableText key={index} text={reference.quote} limit={140}/>)}<SourceQuotes references={signal.references} evidence={health!.evidence}/></div>)}{!scope.scope_signals.length && <p>{scope.explanation}</p>}<ResultStamp result={health!} label="Assessed"/></> : <p className="muted">Scope evidence is not available yet.</p>}</section>
        <section className="briefing-panel" id="briefing-outlook"><h3><Activity size={19}/>Documented delivery outlook</h3><Statements result={briefing.outlook.result}/></section>
        <section className="briefing-panel" id="briefing-risks"><h3><TriangleAlert size={19}/>Risks & dependencies</h3><p className="briefing-qualifier">Returned documented concerns. This is not a priority ranking or a forecast.</p>{docs ? docs.risks.length ? <BriefingItems>{docs.risks.map(risk => <article className="briefing-statement" key={risk.id}><div className="category-chips">{risk.categories.map(category => <span key={category}>{categoryLabels[category] ?? category}</span>)}</div><ExpandableText text={risk.description} limit={150}/><details className="briefing-expanded"><summary>View risk details & source</summary><dl className="briefing-facts"><div><dt>Stated severity</dt><dd><UnknownValue value={risk.severity}/></dd></div><div><dt>Stated impact</dt><dd><UnknownValue value={risk.impact}/></dd></div></dl><SourceQuotes references={risk.references} evidence={docs.evidence}/></details></article>)}</BriefingItems> : <p className="unknown-value">No risk entries were established in retrieved evidence. This does not establish an absence of risk.</p> : <p className="muted">Risk entries are not available yet.</p>}<Link to="/documentation" onClick={() => setDocTab('risks')} className="text-link">Review the full risk register<ArrowUpRight size={14}/></Link></section>
        <section className="briefing-panel" id="briefing-blockers"><h3><ListChecks size={19}/>Blockers & unresolved decisions</h3><Statements result={briefing.blockers.result}/></section>
      </div>
      <section className="briefing-panel" id="briefing-actions"><h3><ListChecks size={19}/>Documented action items</h3><p className="briefing-qualifier">Existing commitments extracted from your sources. Owners and dates are shown only when stated.</p>{docs?.action_items.length ? <details className="briefing-expanded"><summary>Review {docs.action_items.length} documented action entries</summary><div className="table-scroll" role="region" aria-label="Briefing action items" tabIndex={0}><table><caption className="sr-only">Documented actions and their exact sources</caption><thead><tr><th scope="col">Action & evidence</th><th scope="col">Owner</th><th scope="col">Due date</th><th scope="col">Source status</th></tr></thead><tbody>{docs.action_items.map(action => <tr key={action.id}><td><ExpandableText text={action.title} limit={110}/><details className="briefing-expanded"><summary>View action details & source</summary>{action.title !== action.description && <p>{action.description}</p>}<p>Dependency: <UnknownValue value={action.dependency}/></p><SourceQuotes references={action.references} evidence={docs.evidence}/></details></td><td><UnknownValue value={action.owner}/></td><td><UnknownValue value={action.due_date}/></td><td><UnknownValue value={action.status}/></td></tr>)}</tbody></table></div></details> : <p className="unknown-value">{docs ? 'No action entries were established in retrieved evidence.' : 'Action entries are not available yet.'}</p>}{docs && <><ResultStamp result={docs} label="Generated"/><MethodNotes warnings={docs.warnings}/></>}</section>
      <div className="briefing-grid briefing-bottom">
        <section className="briefing-panel" id="briefing-gaps"><h3><CircleHelp size={19}/>Important missing information</h3>{missing.length ? <PreviewList count={2}>{[...new Set(missing)].map(text => <p key={text}>{text}</p>)}</PreviewList> : <p>{busy ? 'Evidence gaps are still being checked.' : 'No additional gaps were flagged by the available results. This does not establish complete project coverage.'}</p>}</section>
        <section className="briefing-panel review-steps"><h3><BookOpen size={19}/>Suggested review steps</h3><span className="badge neutral">Review guidance · not project commitments</span><ul><li>Check the quotations attached to documented concerns before deciding what to prioritize.</li><li>Confirm missing information with the project source and upload updated documents when available.</li><li><a href="#briefing-health-calculation" className="text-link">Review the health calculation and evidence<ArrowUpRight size={14}/></a></li></ul></section>
      </div>
    </>}
  </section>;
}

export function BriefingVisualSummary() {
  const {briefing} = useIntelligence();
  return <VisualSummary documentation={briefing.documentation.result} health={briefing.health.result} outlook={briefing.outlook.result} blockers={briefing.blockers.result} stale={Object.values(briefing).some(work => work.stale)} />;
}
