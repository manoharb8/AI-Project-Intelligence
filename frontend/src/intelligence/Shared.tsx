import {useRef, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, ArrowUpRight, CheckCircle2, CircleHelp, FileText, Info, Play, RefreshCw, ShieldCheck} from 'lucide-react';
import type {Evidence} from '../types';
import type {ResultMetadata, SourceReference} from './types';
import {useSession} from '../SessionContext';
import {Busy, Empty, ErrorNotice, EvidenceReference, Notice, Timestamp} from '../components/UI';

export function UnknownValue({value}: {value: string | null}) {return <span className={value === null ? 'unknown-value' : undefined}>{value ?? 'Not stated'}</span>;}

export function useAvailability(busy = false) {
  const {analysisReady, agents, kb, provider, providerError, checkingProvider, uploading, refreshing, connectionError} = useSession();
  const indexing = uploading || kb?.documents.some(document => document.status === 'processing');
  return busy ? 'A request is running. Please wait.' : indexing ? 'Documents are uploading or indexing. Intelligence will prepare when they finish.' : connectionError ? 'Reconnect to the knowledge base before preparing current intelligence.' : refreshing ? 'Checking current indexed sources…' : !kb?.retrieval_ready ? 'Upload and index project documents first.' : checkingProvider ? 'Checking analysis availability…' : providerError ? 'Availability could not be checked. Try again below.' : !provider?.ready ? 'Analysis is unavailable. Check the provider status below.' : !analysisReady ? Object.values(agents).some(w=>w.error) ? 'Retry the failed project analysis before preparing intelligence.' : 'Project analysis is preparing. Intelligence follows automatically.' : '';
}

export function AvailabilityNotice() {
  const {kb, provider, providerError, checkingProvider, checkProvider} = useSession();
  return <>
    {!kb?.retrieval_ready && <section className="panel"><Empty title="Your evidence comes first" action={<Link to="/documents" className="button">Add project documents<ArrowRight size={16}/></Link>}>Upload proposals, meeting notes, task lists, or sprint updates to use this workspace.</Empty></section>}
    {(providerError || (provider && !provider.ready)) && <ErrorNotice><p>{providerError || provider?.message}</p><button className="button secondary notice-action" disabled={checkingProvider} onClick={() => void checkProvider()}><RefreshCw size={15}/>Check availability</button></ErrorNotice>}
  </>;
}

export function RunControls({query, onQuery, busy, onRun, action, children}: {query: string; onQuery: (value: string) => void; busy: boolean; onRun: () => void; action: string; children?: ReactNode}) {
  const {provider} = useSession();
  const unavailable = useAvailability(busy);
  const reason = unavailable || (query.trim().length < 2 ? 'Enter a focus of at least 2 characters.' : '');
  return <section className="intelligence-command panel"><form onSubmit={event => {event.preventDefault(); if (!reason) onRun();}}><div className="command-input"><label htmlFor="intelligence-focus">Review focus</label><textarea id="intelligence-focus" rows={2} value={query} maxLength={500} disabled={busy} onChange={event => onQuery(event.target.value)} aria-describedby="intelligence-reason"/></div><button className="button" disabled={Boolean(reason)} aria-describedby="intelligence-reason"><Play size={16}/>{busy ? 'Working…' : action}</button></form><div className="command-foot"><span><ShieldCheck size={14}/>Uses your indexed project evidence</span>{provider && <details className="mode-explainer"><summary>Analysis mode<Info size={13}/></summary><p>{provider.provider}. {provider.message}</p></details>}</div><p className="field-help" id="intelligence-reason">{reason}</p>{children}</section>;
}

export function RunFeedback({busy, error, retry, result, stale, label, differentFocus = false}: {busy: boolean; error: string; retry: () => void; result: ResultMetadata | null; stale: boolean; label: string; differentFocus?: boolean}) {
  const unavailable = useAvailability(busy);
  return <>
    {busy && <Busy>{label}{result && ' Your previous result stays available below.'}</Busy>}
    {error && <ErrorNotice><p>{error}</p>{result && <p>Your previous completed result is retained.</p>}<button className="button secondary notice-action" disabled={Boolean(unavailable)} onClick={retry}>Retry request</button></ErrorNotice>}
    {result && differentFocus && <Notice tone="warning">Showing the previous review focus while the new focus is prepared. The completed focus is shown with the result.</Notice>}
    {result && stale && <Notice tone="warning">Sources changed after this result began. It may be out of date. The active view refreshes automatically when evidence is ready; use Retry if a request fails.</Notice>}
    {result && !busy && !error && <p className="sr-only" role="status">Request complete. {result.status === 'insufficient_information' ? 'Insufficient evidence.' : 'Evidence-backed results are available.'}</p>}
  </>;
}

export function ResultStamp({result, label}: {result: ResultMetadata; label: string}) {
  return <div className="intelligence-result-stamp"><span className={`badge ${result.status === 'ok' ? 'indexed' : 'processing'}`}>{result.status === 'ok' ? <CheckCircle2 size={13}/> : <CircleHelp size={13}/>} {result.status === 'insufficient_information' ? 'Insufficient evidence' : result.status === 'partial' ? 'Some information is incomplete' : 'Evidence reviewed'}</span><p>{label} <Timestamp value={result.generated_at}/></p><p className="completed-focus">Results for “{result.query}”</p></div>;
}

export function SourceQuotes({references, evidence}: {references: SourceReference[]; evidence: Evidence[]}) {
  if (!references.length) return null;
  const sources = new Map(evidence.map(item => [item.id, item]));
  return <details className="source-quotes source-disclosure"><summary>View source</summary>{references.map((ref, index) => {
    const source = sources.get(ref.evidence_id);
    return <details className="source-quote" key={`${ref.evidence_id}-${index}`}><summary><FileText size={15}/><span>{source ? `${source.filename} · ${source.location}` : 'Source reference'}<small>Exact supporting quotation</small></span><ArrowUpRight size={14}/></summary><div className="source-quote-body"><blockquote>{ref.quote}</blockquote>{source ? <EvidenceReference evidence={source} includeText/> : <code>{ref.evidence_id}</code>}</div></details>;
  })}</details>;
}

export function MethodNotes({warnings}: {warnings: string[]}) {return <details className="method-notes"><summary><Info size={16}/>Grounding and limitations</summary>{warnings.map(text => <p key={text}>{text}</p>)}</details>;}

export function WorkspaceTabs<T extends string>({tabs, value, onChange, label}: {tabs: {id: T; label: string; count?: number}[]; value: T; onChange: (id: T) => void; label: string}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="workspace-tabs" role="tablist" aria-label={label}>{tabs.map((tab, index) => <button ref={el => {buttons.current[index] = el;}} type="button" role="tab" id={`tab-${tab.id}`} aria-selected={value === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={value === tab.id ? 0 : -1} key={tab.id} onClick={() => onChange(tab.id)} onKeyDown={event => {
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {event.preventDefault(); onChange(tabs[next].id); buttons.current[next]?.focus();}
  }}>{tab.label}<span>{tab.count ?? '—'}</span></button>)}</div>;
}

export function AutomaticControls({busy, waiting, onRefresh, children}: {busy: boolean; waiting: boolean; onRefresh: () => void; children: ReactNode}) {
  const unavailable = useAvailability(busy);
  return <div className="automatic-controls"><div className="automatic-status"><span><ShieldCheck size={16}/>Automatic intelligence</span><p>{unavailable || (waiting ? 'Preparing current evidence shortly…' : 'Updates automatically when new documents are processed.')}</p><button className="button secondary" disabled={Boolean(unavailable) || waiting} onClick={onRefresh}><RefreshCw size={15}/>Refresh</button></div><details className="optional-focus"><summary>Customize review focus & regenerate</summary>{children}</details></div>;
}
