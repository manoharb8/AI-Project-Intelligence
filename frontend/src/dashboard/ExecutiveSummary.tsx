import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Activity, ArrowUpRight, ListChecks, Target, TriangleAlert} from 'lucide-react';
import {useSession} from '../SessionContext';
import {useIntelligence} from '../intelligence/IntelligenceContext';
import {DimensionVisual} from '../presentation/HealthVisuals';
import {UnknownValue} from '../intelligence/Shared';
import {scopeSignals} from './insightsModel';
import {SeverityBadge} from './RiskEvidenceBoard';
import {riskSourceMetadata} from './riskSourceMetadata';
import {canonicalRisks} from './canonicalRisks';
import RiskDetailsDialog from './RiskDetailsDialog';

export default function ExecutiveSummary() {
  const {agents} = useSession();
  const {briefing, setDocTab} = useIntelligence();
  const docs = briefing.documentation.result, health = briefing.health.result;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const grouped = canonicalRisks(docs?.risks ?? []);
  const selected = grouped.risks.find(risk => risk.id === selectedId);
  const signals = scopeSignals(health);
  const scopeQuote = (category: string) => signals.find(signal => signal.category === category)?.references[0]?.quote
    ?? agents.scope.result?.findings.find(finding => finding.category === category)?.quote;
  const score = health?.overall_score ?? null;
  const pending = !docs && (briefing.documentation.busy || briefing.documentation.waiting);
  return <>
    <div className="executive-grid">
      <section className="executive-card executive-health" aria-labelledby="executive-health-title">
        <header><h3 id="executive-health-title"><Activity size={17}/>Project Health</h3><Link to="/project-health" aria-label="View project health details"><ArrowUpRight size={17}/></Link></header>
        <div className="executive-score"><strong aria-label={score === null ? 'Overall health unknown' : `Overall health ${score} out of 100`}>{score ?? '—'}{score !== null && <small>/100</small>}</strong><div><b>{health?.interpretation ?? 'Not assessed'}</b><span>{health ? `${health.assessed_dimensions} of 3 dimensions assessed` : 'Awaiting source assessment'}</span></div></div>
        <p className="executive-caption">Evidence health · not a delivery probability</p>
        <div className="executive-dimensions">{health?.dimensions.map(dimension => <DimensionVisual key={dimension.id} dimension={dimension} compact/>)}</div>
        {health && briefing.health.stale && <p className="executive-caution">Previous source version</p>}
        <Link to="/project-health" className="text-link executive-details">Why this score? / View details<ArrowUpRight size={14}/></Link>
      </section>
      <section className="executive-card" aria-labelledby="executive-risks-title">
        <header><h3 id="executive-risks-title"><TriangleAlert size={17}/>Key Risks</h3><span className="count">{docs ? grouped.risks.length : '—'}</span></header>
        <p className="executive-caption">First 3 identified risks · source order, not a ranking</p>
        <div className="executive-risk-list">{grouped.risks.slice(0,3).map(risk => <button className="executive-risk" key={risk.id} onClick={() => setSelectedId(risk.id)} aria-label={`Inspect ${risk.id}: ${risk.title}`}><span><code>{riskSourceMetadata(risk).sourceId??risk.id}</code><SeverityBadge value={risk.severity}/></span><strong className="executive-excerpt">{riskSourceMetadata(risk).title??risk.title}</strong>{riskSourceMetadata(risk).title&&<span className="executive-one-line">{risk.description}</span>}</button>)}</div>
        {!grouped.risks.length && <p className="executive-empty">{pending ? 'Reviewing documented risks…' : docs ? 'No uniquely identified risks. Review additional observations in the matrix; this is not an all-clear.' : 'Risk results are not available yet.'}</p>}
        <Link to="/documentation" onClick={() => setDocTab('risks')} className="text-link executive-details">View all risk details<ArrowUpRight size={14}/></Link>
      </section>
      <section className="executive-card" aria-labelledby="executive-actions-title">
        <header><h3 id="executive-actions-title"><ListChecks size={17}/>Key Action Items</h3><span className="count">{docs?.action_items.length ?? '—'}</span></header>
        <p className="executive-caption">First 3 documented actions · stated owners and dates</p>
        <ol className="executive-actions">{docs?.action_items.slice(0,3).map(action => <li key={action.id}><strong className="executive-excerpt">{action.title}</strong><dl><div><dt>Owner</dt><dd><UnknownValue value={action.owner}/></dd></div><div><dt>Due</dt><dd><UnknownValue value={action.due_date}/></dd></div></dl><span className="executive-action-status"><UnknownValue value={action.status}/></span></li>)}</ol>
        {!docs?.action_items.length && <p className="executive-empty">{pending ? 'Reviewing action items…' : docs ? 'No action items established in the returned evidence.' : 'Action results are not available yet.'}</p>}
        <Link to="/documentation" onClick={() => setDocTab('action_items')} className="text-link executive-details">View all action details<ArrowUpRight size={14}/></Link>
      </section>
    </div>
    <section className="executive-scope" aria-labelledby="executive-scope-title"><header><h3 id="executive-scope-title"><Target size={17}/>Short Scope Summary</h3><Link className="text-link" to="/scope">View details<ArrowUpRight size={14}/></Link></header><div>{(['goals','deliverables'] as const).map(category => <div key={category}><span className="executive-caption">{category === 'goals' ? 'Documented goal' : 'Deliverables'}</span><p className="executive-excerpt">{scopeQuote(category) ?? 'Not stated in the available results.'}</p></div>)}</div></section>
    <nav className="executive-analysis-links" aria-label="Detailed project analysis">{(['scope','risk','blockers'] as const).map((kind,index) => <Link key={kind} to={['/scope','/risks','/blockers'][index]}><span>{['Scope & Deliverables','Risk & Delivery','Blockers & Actions'][index]}</span><small>{agents[kind].result ? `${agents[kind].result!.findings.length} ${agents[kind].result!.findings.length === 1 ? 'finding' : 'findings'}` : 'Preparing'}{agents[kind].stale ? ' · Previous sources' : ''}</small><ArrowUpRight size={14}/></Link>)}</nav>
    {selected && <RiskDetailsDialog originals={grouped.originals.get(selected.id)} conflicts={grouped.conflicts.get(selected.id)} risks={[selected]} active={selected} evidence={docs?.evidence ?? []} stale={briefing.documentation.stale} onSelect={setSelectedId} onClose={() => setSelectedId(null)}/>}
  </>;
}
