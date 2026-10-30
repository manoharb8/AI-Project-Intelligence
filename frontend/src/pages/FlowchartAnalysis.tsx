import {useCallback, useEffect, useRef, useState, type DragEvent} from 'react';
import {Eye, FileImage, GitBranch, Info, ShieldAlert, Trash2, UploadCloud} from 'lucide-react';
import {Busy, Empty, ErrorNotice, Notice, PageHeading, Timestamp} from '../components/UI';
import {useWorkspace} from '../workspaces/WorkspaceContext';
import {flowchartApi as fallbackApi} from '../flowchart/api';
import type {FlowchartAnalysis, FlowchartStatus, FlowchartSummary, FlowRisk, FlowNode, Priority} from '../flowchart/types';
import {PROJECT_TYPE_LABEL} from '../workspaces/types';

const FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
const BASIS_LABEL = {observed: 'Shown in the diagram', inferred: 'Inferred — needs confirmation'} as const;

const sourceName = (item: FlowchartSummary) => item.page && item.source_type === 'pdf' ? `${item.filename} · page ${item.page}` : item.filename;

function PriorityBadge({priority}: {priority: Priority}) {return <span className={`fc-badge fc-p-${priority.toLowerCase()}`}>{priority}</span>;}

function RiskCard({risk, nodes}: {risk: FlowRisk; nodes: Map<string, FlowNode>}) {
  const refs = [...risk.evidence_nodes];
  return <article className={`fc-risk fc-p-${risk.priority.toLowerCase()}`} aria-label={`${risk.priority} risk: ${risk.title}`}>
    <header>
      <PriorityBadge priority={risk.priority}/>
      <span className={`fc-badge fc-basis-${risk.basis}`}>{BASIS_LABEL[risk.basis]}</span>
      {risk.origin === 'structural_check' && <span className="fc-badge fc-origin" title="Found by rules applied to the extracted steps and arrows">Automatic structure check — verify</span>}
    </header>
    <h3>{risk.title}</h3>
    <p>{risk.description}</p>
    {refs.length > 0 && <p className="fc-evidence"><span>Evidence in diagram:</span>{refs.map(id => <code key={id} title={nodes.get(id)?.label}>{id}{nodes.get(id) ? ` · ${nodes.get(id)!.label}` : ''}</code>)}</p>}
    <dl>
      <div><dt>Why this priority</dt><dd>{risk.priority_reason}</dd></div>
      {risk.assumption && <div><dt>Assumption</dt><dd>{risk.assumption}</dd></div>}
      <div><dt>Suggested mitigation</dt><dd>{risk.mitigation}</dd></div>
    </dl>
    {risk.priority_note && <p className="fc-note"><Info size={14}/>{risk.priority_note}</p>}
  </article>;
}

function Detail({analysis}: {analysis: FlowchartAnalysis}) {
  const nodes = new Map(analysis.nodes.map(n => [n.id, n]));
  const s = analysis.risk_summary;
  const counts: [Priority, number][] = [['Critical', s.critical], ['High', s.high], ['Medium', s.medium], ['Low', s.low]];
  return <section className="fc-detail" aria-label="Flowchart analysis result">
    <div className="panel fc-overview">
      <p className="eyebrow">{PROJECT_TYPE_LABEL[analysis.project_type]} project · {analysis.provider}{analysis.model ? ` · ${analysis.model}` : ''}</p>
      <h2>{analysis.title || sourceName(analysis)}</h2>
      <p className="fc-purpose"><strong>Purpose:</strong> {analysis.purpose}</p>
      <p className="muted fc-meta">{sourceName(analysis)} · <Timestamp value={analysis.created_at}/> · image legibility: <b>{analysis.legibility}</b></p>
    </div>
    {analysis.warnings.map(w => <Notice key={w} tone="warning">{w}</Notice>)}
    {analysis.image_issues.length > 0 && <Notice tone="warning">Image issues reported: {analysis.image_issues.join(' ')}</Notice>}
    <div className="fc-counts" role="list" aria-label="Risks by priority">
      {counts.map(([p, n]) => <div role="listitem" key={p} className={`fc-count fc-p-${p.toLowerCase()}`}><b>{n}</b><span>{p}</span></div>)}
      <div role="listitem" className="fc-count fc-basis-split"><b>{s.observed} / {s.inferred}</b><span>Shown in diagram / inferred</span></div>
    </div>
    <div className="fc-columns">
      <div className="panel fc-image">
        <h3><Eye size={17}/> The diagram that was analysed</h3>
        {analysis.image_data_url ? <img src={analysis.image_data_url} alt={`Uploaded flowchart: ${analysis.filename}`}/> : <p className="muted">The stored image is not available.</p>}
      </div>
      <div className="panel fc-structure">
        <h3><GitBranch size={17}/> What was read from it</h3>
        <p className="muted">Check this against your diagram. Findings are only as accurate as this reading.</p>
        <div className="table-scroll" role="region" aria-label="Extracted steps" tabIndex={0}>
          <table className="compact-table"><caption className="sr-only">Steps found in the diagram</caption>
            <thead><tr><th scope="col">ID</th><th scope="col">Step text</th><th scope="col">Type</th></tr></thead>
            <tbody>{analysis.nodes.map(n => <tr key={n.id}><td><code>{n.id}</code></td><td>{n.label}{!n.legible && <em className="fc-unreadable"> (hard to read)</em>}</td><td>{n.type.replace('_', ' ')}</td></tr>)}</tbody>
          </table>
        </div>
        <h4>Arrows ({analysis.edges.length})</h4>
        <ul className="fc-edges">{analysis.edges.map((e, i) => <li key={`${e.source}-${e.target}-${i}`}><code>{e.source}</code> → <code>{e.target}</code>{e.label && <span> “{e.label}”</span>}</li>)}</ul>
      </div>
    </div>
    <div className="panel fc-risks">
      <div className="section-heading"><div><p className="eyebrow">Risk assessment</p><h2>Risks by priority</h2></div><ShieldAlert size={22}/></div>
      <p className="muted">Critical and High are reserved for problems the diagram itself shows. Anything the model had to assume is labelled and rated no higher than Medium.</p>
      {analysis.risks.length ? analysis.risks.map(r => <RiskCard key={r.id} risk={r} nodes={nodes}/>) : <Empty title="No risks identified">No supported problems were found in the steps and arrows that could be read.</Empty>}
    </div>
    {analysis.uncertainties.length > 0 && <div className="panel"><h3>Uncertainties</h3><ul>{analysis.uncertainties.map(u => <li key={u}>{u}</li>)}</ul></div>}
    {analysis.processing_notes.length > 0 && <p className="muted fc-meta">Image preparation: {analysis.processing_notes.join(' ')}</p>}
    <p className="muted fc-disclaimer">AI reading of an image can contain mistakes. Verify the extracted steps and arrows before acting on any finding.</p>
  </section>;
}

export default function FlowchartAnalysisPage() {
  const workspace = useWorkspace();
  const api = workspace?.flowchartApi ?? fallbackApi;
  const [status, setStatus] = useState<FlowchartStatus | null>(null);
  const [items, setItems] = useState<FlowchartSummary[]>([]);
  const [detail, setDetail] = useState<FlowchartAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const opening = useRef(0);
  useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  const fail = (e: unknown, fallback: string) => {if (alive.current) setError(e instanceof Error ? e.message : fallback);};

  const open = useCallback(async (id: string) => {
    const ticket = ++opening.current;
    try {const value = await api.get(id); if (alive.current && ticket === opening.current) {setDetail(value); setError('');}}
    catch (e) {if (alive.current && ticket === opening.current) setError(e instanceof Error ? e.message : 'The analysis could not be opened.');}
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, list] = await Promise.all([api.status(), api.list()]);
        if (cancelled) return;
        setStatus(s); setItems(list);
        if (list[0]) void open(list[0].id);
      } catch (e) {if (!cancelled) setError(e instanceof Error ? e.message : 'Flowchart analysis is unavailable. Check that the backend is running.');}
      finally {if (!cancelled) setLoading(false);}
    })();
    return () => {cancelled = true;};
  }, [api, open]);

  async function analyze(files: File[]) {
    if (busy || !files.length) return;
    setNotes([]); setError('');
    if (files.length > 1) {setError('Choose one file at a time.'); return;}
    const file = files[0];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!file.name.includes('.') || !FORMATS.includes(extension)) {setError(`${file.name}: unsupported format. Choose a PNG, JPEG, WebP or PDF.`); return;}
    if (file.size > MAX_BYTES) {setError(`${file.name}: exceeds 10 MB. Choose a smaller file.`); return;}
    setBusy(true);
    try {
      const result = await api.analyze(file);
      if (!alive.current) return;
      const extra = result.skipped.map(s => `Page ${s.page} skipped: ${s.reason}`);
      setNotes([...result.notes, ...extra]);
      setDetail(result.analyses[0]);
      setItems(await api.list());
    } catch (e) {fail(e, 'The diagram could not be analysed. Please try again.');}
    finally {if (alive.current) setBusy(false);}
  }

  async function remove(id: string) {
    setConfirming('');
    try {
      await api.remove(id);
      if (!alive.current) return;
      const list = await api.list();
      setItems(list);
      if (detail?.id === id) {setDetail(null); if (list[0]) void open(list[0].id);}
    } catch (e) {fail(e, 'The analysis could not be deleted.');}
  }

  const drop = (event: DragEvent) => {event.preventDefault(); setDragging(false); void analyze(Array.from(event.dataTransfer.files));};
  const unavailable = status !== null && !status.ready;

  return <div className="flowchart-page">
    <PageHeading eyebrow="Project Analysis" title="Flowchart Analysis" description="Upload a flowchart as PNG, JPEG, WebP or PDF and get a priority-based risk assessment grounded in what the diagram shows."/>
    {unavailable && <Notice tone="warning"><strong>Flowchart analysis is not configured.</strong> {status!.message}</Notice>}
    {status?.ready && <p className="muted fc-provider"><Info size={14}/> {status.provider}{status.model ? ` · ${status.model}` : ''}. {status.message}</p>}
    <section className={`panel fc-upload ${dragging ? 'dragging' : ''}`} aria-labelledby="fc-upload-title"
      onDragOver={e => {e.preventDefault(); if (!busy) setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <div className="upload-icon"><UploadCloud size={30}/></div>
      <h2 id="fc-upload-title">{dragging ? 'Drop to analyse this diagram' : 'Add a flowchart'}</h2>
      <p>Drag a file here, or choose one. PNG, JPEG, WebP or PDF <span>·</span> up to 10 MB.</p>
      <button className="button" disabled={busy || unavailable} onClick={() => input.current?.click()}><FileImage size={16}/> Choose flowchart</button>
      <input ref={input} type="file" aria-label="Choose a flowchart image or PDF" className="sr-only" tabIndex={-1} disabled={busy || unavailable}
        accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
        onChange={e => {void analyze(Array.from(e.target.files ?? [])); e.target.value = '';}}/>
    </section>
    {busy && <Busy>Reading the diagram and assessing risk. This usually takes 15–60 seconds; a PDF analyses each page.</Busy>}
    {error && <ErrorNotice>{error}</ErrorNotice>}
    {notes.map(n => <Notice key={n}>{n}</Notice>)}
    {loading && !busy && <Busy>Loading saved flowchart analyses…</Busy>}
    {items.length > 0 && <section className="panel fc-history" aria-label="Saved flowchart analyses">
      <h2>Saved analyses ({items.length})</h2>
      <ul>{items.map(item => <li key={item.id} className={detail?.id === item.id ? 'selected' : ''}>
        <button className="fc-open" aria-current={detail?.id === item.id ? 'true' : undefined} onClick={() => void open(item.id)}>
          <strong>{item.title || sourceName(item)}</strong><small>{sourceName(item)} · {item.node_count} steps · <Timestamp value={item.created_at}/></small>
        </button>
        <span className="fc-mini">{PRIORITIES.map(p => {const n = item.risk_summary[p.toLowerCase() as 'critical' | 'high' | 'medium' | 'low']; return n ? <span key={p} className={`fc-badge fc-p-${p.toLowerCase()}`} title={`${n} ${p}`}>{n} {p}</span> : null;})}</span>
        {confirming === item.id
          ? <span className="fc-confirm"><button className="button secondary danger" onClick={() => void remove(item.id)}>Confirm delete</button><button className="button secondary" onClick={() => setConfirming('')}>Cancel</button></span>
          : <button className="icon-button" aria-label={`Delete analysis of ${sourceName(item)}`} onClick={() => setConfirming(item.id)}><Trash2 size={16}/></button>}
      </li>)}</ul>
    </section>}
    {detail && <Detail analysis={detail}/>}
    {!loading && !items.length && !detail && !busy && !error && <Empty title="No flowcharts analysed yet">Add a diagram above. The result stays saved in this workspace.</Empty>}
  </div>;
}
