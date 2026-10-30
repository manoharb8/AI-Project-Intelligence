import {useEffect, useId, useRef, useState} from 'react';
import {FileText, X} from 'lucide-react';
import type {RiskEntry} from '../intelligence/types';
import type {Evidence} from '../types';
import {SourceQuotes, UnknownValue} from '../intelligence/Shared';
import {riskSourceMetadata} from './riskSourceMetadata';
import {categoryLabels} from '../agentSpecs';

export default function RiskDetailsDialog({risks, active, evidence, stale, onSelect, onClose, originals, conflicts, inline = false}: {
  inline?: boolean;
  originals?: RiskEntry[]; conflicts?: string[];
  risks: RiskEntry[]; active: RiskEntry; evidence: Evidence[]; stale: boolean;
  onSelect: (id: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const meta = riskSourceMetadata(active);
  const [previous] = useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => {
    if (inline) return;
    const element = dialog.current!;
    element.showModal();
    return () => {element.close(); if (previous?.isConnected) previous.focus();};
  }, [previous, inline]);
  const content = (
    <div className="risk-detail-content">
      <header><div><span className="section-overline">SOURCE-BACKED RISK RECORD</span><h2 id={titleId}>Risk details</h2></div><button type="button" className="icon-button" autoFocus={!inline} onClick={onClose} aria-label="Close risk details"><X size={20}/></button></header>
      {stale && <p className="rpm-caution">Previous source version · this result may be out of date.</p>}
      {risks.length > 1 && <div className="rpm-coincident"><p>{risks.length} entries share these exact coordinates. Choose a record to inspect.</p><div>{risks.map(risk => <button type="button" key={risk.id} onClick={() => onSelect(risk.id)} aria-pressed={active.id === risk.id}>{risk.id}</button>)}</div></div>}
      <p className="rpm-record-id"><FileText size={15}/>{meta.sourceId??active.id}{meta.sourceId&&<small>Record {active.id}</small>}</p>
      <h3>{meta.title??active.title}</h3>
      {active.description !== active.title && <p>{active.description}</p>}
      <div className="category-chips">{active.categories.map(category => <span key={category}>{categoryLabels[category] ?? category}</span>)}</div>
      <dl className="register-facts"><div><dt>Stated severity</dt><dd><UnknownValue value={active.severity}/></dd></div><div><dt>Probability / stated likelihood</dt><dd><UnknownValue value={active.likelihood}/></dd></div><div><dt>Stated impact</dt><dd><UnknownValue value={active.impact}/></dd></div><div><dt>Source status</dt><dd><UnknownValue value={active.status}/></dd></div></dl>
      <dl className="register-facts"><div><dt>Stated risk owner</dt><dd><UnknownValue value={meta.owner}/></dd></div><div><dt>Stated due date</dt><dd><UnknownValue value={meta.dueDate}/></dd></div></dl>
      <div className="mitigation"><h4>Documented mitigation / action</h4><p><UnknownValue value={active.mitigation}/></p></div>
      {conflicts?.length ? <p className="rpm-caution">Conflicting source values: {conflicts.join(', ')}. No value was chosen. Review the original records below.</p> : null}
      {originals && originals.length > 1 && <details className="rpm-original-records"><summary>{originals.length} supporting extracted records · review original fields</summary>{originals.map(record => <article key={record.id}><h4>{record.id}: {record.title}</h4><p>{record.description}</p><dl className="register-facts">{(['likelihood','impact','severity','status','mitigation'] as const).map(key => <div key={key}><dt>{key}</dt><dd><UnknownValue value={record[key]}/></dd></div>)}</dl><SourceQuotes references={record.references} evidence={evidence}/></article>)}</details>}
      <h4 className="rpm-evidence-title">Source evidence</h4>
      {active.references.length ? <SourceQuotes references={active.references} evidence={evidence}/> : <p className="unknown-value">Source reference not available in this result.</p>}
    </div>
  );
  if (inline) return <section className="rpm-inline-details" tabIndex={-1} aria-labelledby={titleId} onKeyDown={event => {if (event.key === 'Escape') {event.stopPropagation(); onClose();}}}>{content}</section>;
  return <dialog ref={dialog} className="risk-detail-dialog" aria-labelledby={titleId}
    onCancel={event => {event.preventDefault(); onClose();}}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), summary, a[href], input, select, textarea, [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
    }}
    onClick={event => {if (event.target === event.currentTarget) onClose();}}>
{content}
  </dialog>;
}
