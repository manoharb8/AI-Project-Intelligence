import {Link} from 'react-router-dom';
import {ArrowRight, CheckCircle2, CircleHelp, Quote, RefreshCw, Info, Play} from 'lucide-react';
import type {AgentKind, AgentFinding, Evidence, KnowledgeBase} from '../types';
import {Busy, Empty, ErrorNotice, EvidenceReference, Notice, PageHeading, Timestamp} from '../components/UI';
import {useSession} from '../SessionContext';
import {agentSpecs, categoryLabels} from '../agentSpecs';
export {agentSpecs} from '../agentSpecs';

function FindingRow({finding, evidence, index}: {finding: AgentFinding; evidence: Evidence | undefined; index: number}) {
  const known = finding.information_state === 'known';
  return <article className="finding-row"><div className="finding-header"><span className="finding-number">Finding {index + 1}</span><span className={`badge ${known ? 'indexed' : 'processing'}`}>{known ? <CheckCircle2 size={13}/> : <CircleHelp size={13}/>} {known ? 'Explicitly stated' : 'Some details unclear'}</span></div><p className="quote-label"><Quote size={15}/>Source quotation</p><blockquote className="finding-text">{finding.quote}</blockquote>
    <dl className="finding-facts">{(finding.category === 'action_items' || finding.category === 'responsibilities') && <div><dt>Owner</dt><dd className={finding.owner === null ? 'unknown' : ''}>{finding.owner ?? 'Not stated'}</dd></div>}{finding.category === 'action_items' && <><div><dt>Due date</dt><dd className={finding.due_date === null ? 'unknown' : ''}>{finding.due_date ?? 'Not stated'}</dd></div><div><dt>Status in source</dt><dd className={finding.source_status === null ? 'unknown' : ''}>{finding.source_status ?? 'Not stated'}</dd></div></>}{finding.dates.length > 0 && finding.category !== 'action_items' && <div><dt>Dates in source</dt><dd>{finding.dates.join(' · ')}</dd></div>}{finding.severity && <div><dt>Stated severity</dt><dd>{finding.severity}</dd></div>}</dl>
    {evidence ? <EvidenceReference evidence={evidence} includeText/> : <div className="missing-reference"><p>Source passage unavailable in this result.</p><code>{finding.evidence_id}</code></div>}
  </article>;
}

export default function AgentAnalysis({kind, kb}: {kind: AgentKind; kb: KnowledgeBase}) {
  const spec = agentSpecs[kind];
  const {agents, revision, provider, providerError, checkingProvider, checkProvider} = useSession();
  const state = agents[kind];
  const {query, setQuery, result, busy, error} = state;
  const disabledReason = busy ? 'Analysis is running. Please wait before starting another run.' : !kb.retrieval_ready ? 'Add indexed project evidence to enable analysis.' : checkingProvider ? 'Checking whether analysis is available…' : providerError ? 'Availability could not be checked. Try checking again.' : !provider?.ready ? 'Analysis is unavailable. Review the availability message below.' : query.trim().length < 2 ? 'Enter an analysis focus of at least 2 characters.' : '';
  function run() {if (!disabledReason) void state.run(query, revision);}
  const evidence = new Map(result?.evidence.map(item => [item.id, item]) ?? []);
  return <>
    <PageHeading eyebrow="Project Analysis" title={spec.title} description={spec.description}/>
    <section className="panel analysis-controls"><div className="analysis-controls-heading"><h2>Focus your analysis</h2><span className={`badge ${provider?.ready && !checkingProvider ? 'indexed' : 'neutral'}`}>{provider?.ready && !checkingProvider ? <CheckCircle2 size={13}/> : <CircleHelp size={13}/>} {checkingProvider ? 'Checking availability…' : provider?.ready ? 'Analysis available' : 'Analysis unavailable'}</span></div>
      <form onSubmit={event => {event.preventDefault(); run();}}><label htmlFor="analysis-query">Analysis focus</label><textarea id="analysis-query" value={query} maxLength={500} rows={3} disabled={busy} aria-describedby="analysis-help analysis-disabled-reason" onChange={event => setQuery(event.target.value)}/><div className="analysis-action"><p id="analysis-help">Findings use retrieved source passages. Unstated details stay unknown.</p><button className="button" disabled={Boolean(disabledReason)} aria-describedby="analysis-disabled-reason"><Play size={16}/>{busy ? 'Run analysis · in progress' : 'Run analysis'}</button></div><p id="analysis-disabled-reason" className="field-help">{disabledReason}</p></form>
      {provider && <details className="provider-details"><summary><Info size={15}/>About this analysis mode</summary><p><strong>{provider.provider}</strong></p><p>{provider.message}</p></details>}
    </section>
    {!kb.retrieval_ready && <section className="panel"><Empty title="Add project evidence first" action={<Link className="button" to="/documents">Open Documents<ArrowRight size={16}/></Link>}>Upload and index documents to start analysis.</Empty></section>}
    {(providerError || (provider && !provider.ready)) && <ErrorNotice><p>{providerError || provider?.message}</p><button className="button secondary notice-action" disabled={checkingProvider} onClick={() => void checkProvider()}><RefreshCw size={15}/>Check availability again</button></ErrorNotice>}
    {error && <ErrorNotice><p>{error}</p>{result && <p>Your previous completed result is still available below.</p>}<button className="button secondary notice-action" disabled={Boolean(disabledReason)} onClick={run}>Retry analysis</button></ErrorNotice>}
    {busy && <Busy>Retrieving relevant passages and verifying each finding…{result && ' Previous results remain below.'}</Busy>}
    {result && !busy && !error && <p className="sr-only" role="status">{result.status === 'insufficient_information' ? 'Analysis finished with insufficient information.' : `Analysis finished. ${result.findings.length} findings. ${result.status === 'partial' ? 'Some information is incomplete.' : ''}`}</p>}
    {!result && !busy && kb.retrieval_ready && provider?.ready && !checkingProvider && !error && <section className="panel"><Empty title="Not analyzed yet">Run this agent to organize the facts supported by your documents. No findings have been generated for this view.</Empty></section>}
    {result && <>
      {state.resultRevision < revision && <Notice tone="warning">Sources changed after this analysis began. These findings may be out of date. Run analysis again to review the latest evidence.</Notice>}
      <section className="result-overview" aria-label="Analysis result summary"><div><p className="eyebrow">Analysis results</p><h2>{result.status === 'insufficient_information' ? 'Insufficient information' : result.status === 'partial' ? 'Analysis complete · partial information' : 'Analysis complete'}</h2><p className="muted result-message">{result.message}</p><p className="result-query">Focus: {result.query}</p><p className="generated-at">Generated <Timestamp value={result.generated_at}/></p></div><dl className="result-metrics"><div><dt>Findings</dt><dd>{result.findings.length}</dd></div><div><dt>Passages reviewed</dt><dd>{result.retrieved_count}</dd></div></dl></section>
      <div className="analysis-workspace"><nav className="coverage" aria-label="Evidence coverage"><p className="coverage-heading">In this analysis</p>{result.coverage.map(category => <a key={category.category} href={`#category-${category.category}`}><strong>{categoryLabels[category.category] ?? category.category}</strong><span className={`coverage-state ${category.state}`}><span>{category.state === 'missing' ? 'No evidence found' : category.state === 'unclear' ? 'Unclear' : 'Found'}</span><b>{category.count}</b></span></a>)}</nav>
      <section className="panel analysis-findings">{result.coverage.map(category => <section className="finding-category" tabIndex={-1} id={`category-${category.category}`} key={category.category}><div className="category-heading"><h3>{categoryLabels[category.category] ?? category.category}</h3><span className="count">{category.count}</span></div>{result.findings.filter(finding => finding.category === category.category).map((finding, index) => <FindingRow key={`${finding.evidence_id}-${index}`} finding={finding} evidence={evidence.get(finding.evidence_id)} index={index}/>)}{category.count === 0 && <p className="missing-finding"><CircleHelp size={18}/><span>Not established in the retrieved evidence. No information has been assumed.</span></p>}</section>)}</section></div>
      <div className="analysis-notes"><Info size={19}/><div><h3>Read findings alongside their evidence</h3><p>Missing information does not establish the absence of risks, blockers, or obligations.</p>{result.evidence_limited && <p>This analysis is limited to the retrieved passages.</p>}{result.warnings.map((warning, index) => <p key={index}>{warning}</p>)}<small>Analysis mode: {result.provider}</small></div></div>
    </>}
  </>;
}
