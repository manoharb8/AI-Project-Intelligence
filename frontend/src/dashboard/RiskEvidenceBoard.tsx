import {useId, useState, type CSSProperties} from 'react';
import {ArrowUpRight, FileText, Layers, Quote, ShieldCheck} from 'lucide-react';
import type {RiskEntry} from '../intelligence/types';
import type {Evidence} from '../types';
import {riskSourceMetadata} from './riskSourceMetadata';
import {positionReason, severityOf, stated, type AxisMode} from './riskMatrixModel';

export function SeverityBadge({value}: {value: string | null}) {
  return <span className={`rpm-severity rpm-${severityOf(value)?.toLowerCase() ?? 'other'}`}><i aria-hidden="true"/>{stated(value)}</span>;
}

function EvidenceCard({risk, evidence, probability, impact, index, onOpen, observations = false}: {
  risk: RiskEntry; evidence: Evidence[]; probability: AxisMode; impact: AxisMode; index: number; observations?: boolean; onOpen: (risk: RiskEntry) => void;
}) {
  const id = useId();
  const meta = riskSourceMetadata(risk);
  const [inspect, setInspect] = useState(false);
  const first = risk.references[0];
  const source = evidence.find(item => item.id === first?.evidence_id);
  const sourceLabel = source ? `${source.filename} · ${source.location}` : first?.evidence_id ?? 'Source reference not available';
  return <article className={`rpm-evidence-card ${inspect ? 'rpm-evidence-inspecting' : ''}`} style={{'--reveal-delay':`${Math.min(index, 5) * 35}ms`} as CSSProperties}
    onMouseEnter={() => setInspect(true)} onMouseLeave={() => setInspect(false)} onKeyDown={event => {if (event.key === 'Escape') setInspect(false);}}>
    <button type="button" className="rpm-evidence-open" aria-label={`Review risk ${risk.id}: ${risk.title}`} aria-describedby={inspect ? `${id}-preview` : undefined}
      onFocus={() => setInspect(true)} onBlur={() => setInspect(false)} onClick={() => {setInspect(false);onOpen(risk);}}>
      <span className="rpm-evidence-card-top"><span className="rpm-evidence-symbol"><FileText size={16}/></span><code>{meta.sourceId??'Observation'}</code><SeverityBadge value={risk.severity}/></span>
      <strong className="rpm-evidence-title-text">{meta.title??risk.title}</strong>
      <span className="rpm-evidence-values">Probability: {stated(risk.likelihood)} · Impact: {stated(risk.impact)}</span>
      <span className="rpm-evidence-position">{observations ? 'Evidence-only observation · no unambiguous documented Risk ID' : `Unpositioned · ${positionReason(risk, probability, impact)}`}</span>
      <span className="rpm-evidence-source"><FileText size={13}/><span>View source</span><ArrowUpRight size={14}/></span>
      <span className="rpm-evidence-open-label">Inspect record & evidence<span>{risk.references.length} source {risk.references.length === 1 ? 'reference' : 'references'}</span></span>
    </button>
    {inspect && <div role="tooltip" id={`${id}-preview`} className="rpm-evidence-preview">
      <div><Quote size={14}/><strong>Source evidence</strong><code>{meta.sourceId??'Observation'}</code></div>
      {first ? <blockquote>{first.quote}</blockquote> : <p>No source quotation is available in this returned record.</p>}
      <p>{sourceLabel}</p><p>Severity: {stated(risk.severity)} · Probability: {stated(risk.likelihood)} · Impact: {stated(risk.impact)}</p>
      <p>Status: {stated(risk.status)} · Owner: {stated(meta.owner)} · Due: {stated(meta.dueDate)}</p>
      <small>Open the record to review all original fields and supporting quotations.</small>
    </div>}
  </article>;
}

export default function RiskEvidenceBoard({risks, evidence, probability, impact, mixed, onOpen, observations = false}: {
  risks: RiskEntry[]; evidence: Evidence[]; probability: AxisMode; impact: AxisMode; mixed: boolean; observations?: boolean; onOpen: (risk: RiskEntry) => void;
}) {
  const id = useId();
  const sections = observations ? [{label:'Additional source observations · not uniquely identified risks',items:risks}] : [
    {label:'Probability stated · impact not stated',items:risks.filter(r=>r.likelihood?.trim()&&!r.impact?.trim())},
    {label:'Impact stated · probability not stated',items:risks.filter(r=>r.impact?.trim()&&!r.likelihood?.trim())},
    {label:'Probability and impact not stated',items:risks.filter(r=>!r.likelihood?.trim()&&!r.impact?.trim())},
    {label:'Stated descriptions without comparable coordinates',items:risks.filter(r=>r.likelihood?.trim()&&r.impact?.trim())},
  ].filter(section=>section.items.length);
  const missing = risks.some(risk => !risk.likelihood?.trim() || !risk.impact?.trim());
  return <section className={`rpm-evidence-board ${mixed ? 'rpm-evidence-mixed' : ''}`} aria-labelledby={`${id}-title`}>
    <header><span className="rpm-evidence-board-symbol"><Layers size={21}/></span><div><span className="section-overline">EVIDENCE VIEW · {risks.length} {risks.length === 1 ? 'RECORD' : 'RECORDS'}</span><h4 id={`${id}-title`}>{observations ? 'Additional extracted observations' : 'Position not established from source evidence'}</h4><p>{observations ? 'These records have no unambiguous documented Risk ID. They are kept separately, with all evidence, and excluded from unique-risk counts and positioning.' : missing ? 'The source documents do not provide enough probability / impact information to position these records.' : 'The stated values do not establish comparable coordinates on the selected axes.'} Review the actual risks and their evidence below.</p></div></header>
    <div className="rpm-evidence-board-note"><ShieldCheck size={14}/><span>Source order within each evidence group · equal visual weight · no priority ranking inferred</span></div>
    <div className="rpm-evidence-board-scroll" role="region" aria-label={observations ? "Additional evidence-only observations" : "Risk evidence records without established positions"} tabIndex={0}>
      <div>{sections.map(section=><section className="rpm-partial-lane" key={section.label} aria-label={section.label}><h5>{section.label}<span>{section.items.length} records</span></h5><div className="rpm-evidence-grid">{section.items.map((risk,index)=><EvidenceCard observations={observations} key={risk.id} risk={risk} evidence={evidence} probability={probability} impact={impact} index={index} onOpen={onOpen}/>)}</div></section>)}</div>
    </div>
  </section>;
}
