import {DimensionVisual, HealthPulse} from '../presentation/HealthVisuals';
import {Activity, ArrowDownRight, CircleHelp, Layers, ShieldCheck, Target, TriangleAlert} from 'lucide-react';
import {Empty, PageHeading} from '../components/UI';
import {useSession} from '../SessionContext';
import {useIntelligence} from '../intelligence/IntelligenceContext';
import {AutomaticControls, AvailabilityNotice, MethodNotes, ResultStamp, RunControls, RunFeedback, SourceQuotes, useAvailability} from '../intelligence/Shared';
import type {HealthDimension} from '../intelligence/types';
import {categoryLabels} from '../agentSpecs';


function Dimension({dimension}: {dimension: HealthDimension}) {
  const Icon = dimension.id === 'scope_clarity' ? Target : dimension.id === 'timeline_risk' ? TriangleAlert : Layers;
  const state = dimension.state === 'conflicting_evidence' ? 'Conflicting evidence' : dimension.score === null ? 'Insufficient evidence' : dimension.higher_is_better ? 'Higher is better' : 'Higher means more risk';
  return <article className={`health-dimension dimension-${dimension.id}`}><div className="dimension-title"><span><Icon size={20}/>{dimension.label}</span><small>{dimension.weight}% weight</small></div><DimensionVisual dimension={dimension} evidenceHref={`#health-evidence-${dimension.id}`}/><p className="dimension-state">{dimension.score === null && <CircleHelp size={14}/>} {state}</p>{dimension.id === 'blocker_health' && <p className="dimension-count"><b>{dimension.count ?? 'Unknown'}</b> {dimension.count === 1 ? 'blocker / issue statement' : 'blocker / issue statements'}</p>}{dimension.id === 'scope_clarity' && <p className="dimension-count"><b>{dimension.count ?? 'Unknown'}</b> of 5 categories explicitly established</p>}{dimension.id === 'timeline_risk' && <p className="dimension-count"><b>{dimension.count ?? 'Unknown'}</b> documented risk indicators</p>}<p className="dimension-calculation">{dimension.calculation}</p></article>;
}

export default function ProjectHealth() {
  const {revision, kb} = useSession();
  const {health: state} = useIntelligence();
  const {result, query, setQuery, busy, error} = state;
  const unavailable = useAvailability(busy);
  const run = () => {if (!unavailable && query.trim().length >= 2) void state.run(query, revision);};
  return <div className="intelligence-page health-page">
    <PageHeading eyebrow="Project Intelligence" title="Project Health" description="An explainable assessment of scope, schedule concerns, and blockers."/>
    <AutomaticControls busy={busy} waiting={state.waiting} onRefresh={() => void state.refresh()}><RunControls query={query} onQuery={setQuery} busy={busy} onRun={run} action="Assess project health"/></AutomaticControls>
    <AvailabilityNotice/>
    <RunFeedback busy={busy} error={error} retry={run} result={result} stale={state.stale} differentFocus={state.previousFocus} label="Reviewing the three analysis dimensions and calculating their contributions…"/>
    {result && <ResultStamp result={result} label="Assessed"/>}
    <section className="health-overview" aria-labelledby="health-outcome"><div className="health-overview-main"><span className="health-kicker"><Activity size={16}/>EVIDENCE HEALTH</span><h2 id="health-outcome">{result?.interpretation ?? 'A clear picture starts with evidence.'}</h2><p>{result ? result.overall_score === null ? 'An overall score is unavailable until all three dimensions can be assessed. Review the gaps below.' : 'A deterministic view of the concerns documented in your retrieved evidence. Follow the calculation and sources below.' : 'The assessment prepares automatically when indexed evidence is ready. Missing information stays visible.'}</p><div className="health-overview-foot"><span><ShieldCheck size={16}/>Explainable by design</span><span>{result ? `${result.assessed_dimensions} of 3 dimensions assessed` : 'Prepared automatically when evidence is ready'}</span></div></div><HealthPulse score={result?.overall_score ?? null} interpretation={result?.interpretation} dimensions={result?.dimensions}/></section>
    {!result && kb?.retrieval_ready && !busy && !error && <div className="health-empty-line"><CircleHelp size={18}/><p>No score has been calculated. Missing evidence will never appear as a healthy project.</p></div>}
    {result && <>
      <div className="health-dimensions">{result.dimensions.map(dimension => <Dimension dimension={dimension} key={dimension.id}/>)}</div>
      <section className="health-explanation panel"><div className="section-heading"><div><p className="eyebrow">Transparent scoring</p><h2>Why this score?</h2></div><ArrowDownRight size={22}/></div><p className="health-formula">{result.methodology}</p><div className="dimension-explanations">{result.dimensions.map(dimension => <article id={`health-evidence-${dimension.id}`} key={dimension.id}><h3>{dimension.label}</h3><p>{dimension.explanation}</p>{dimension.scope_signals.length > 0 && <ul className="scope-signal-list">{dimension.scope_signals.map(signal => <li key={signal.category}><span>{categoryLabels[signal.category] ?? signal.category}</span><span className={`signal-state ${signal.state}`}>{signal.state === 'known' ? 'Established' : signal.state === 'unclear' ? 'Unclear' : 'Not established'}</span><b>{signal.points} pts</b></li>)}</ul>}{dimension.references.length ? <SourceQuotes references={dimension.references} evidence={result.evidence}/> : <p className="unknown-value evidence-gap">No supporting statements were established for this dimension.</p>}</article>)}</div></section>
      {result.status === 'insufficient_information' && <Empty title="More evidence is needed">Add scope details, an explicit schedule assessment, and current blocker information, then run the assessment again.</Empty>}
      <MethodNotes warnings={result.warnings}/>
    </>}
  </div>;
}
