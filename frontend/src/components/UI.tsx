import type {ReactNode} from 'react';
import {FileText, LoaderCircle, AlertCircle, CheckCircle2, Clock3, Info, ArrowRight, Files, Database, Search, Target, TriangleAlert, ListChecks} from 'lucide-react';
import type {Evidence, ProjectDocument} from '../types';

export function PageHeading({eyebrow, title, description, action}: {eyebrow: string; title: string; description: string; action?: ReactNode}) {
  const iconMap = {'Documents': Files, 'Knowledge Base': Database, 'Evidence Search': Search, 'Scope & Deliverables': Target, 'Risk & Delivery': TriangleAlert, 'Blockers & Actions': ListChecks};
  const Icon = iconMap[title as keyof typeof iconMap];
  return <div className="page-heading"><div className="page-heading-main">{Icon && <span className="page-title-icon"><Icon size={23}/></span>}<div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted page-description">{description}</p></div></div>{action}</div>;
}
export function ErrorNotice({children}: {children: ReactNode}) {return <div className="notice error" role="alert"><AlertCircle size={19}/><div>{children}</div></div>;}
export function Busy({children}: {children: ReactNode}) {return <div className="notice" role="status"><LoaderCircle className="spin" size={19}/><div>{children}</div></div>;}
export function Notice({children, tone = 'neutral'}: {children: ReactNode; tone?: 'neutral' | 'warning' | 'success'}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertCircle : Info;
  return <div className={`notice ${tone}`} role="status"><Icon size={19}/><div>{children}</div></div>;
}
export function Empty({title, children, action}: {title: string; children: ReactNode; action?: ReactNode}) {
  return <div className="empty"><span className="empty-icon"><FileText size={26}/></span><h3>{title}</h3><p>{children}</p>{action && <div className="empty-action">{action}</div>}</div>;
}
export function FileSize({bytes}: {bytes: number}) {return <>{bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`}</>;}
export function Timestamp({value}: {value: string}) {
  const date = new Date(value);
  return <time dateTime={value} title={value}>{Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}</time>;
}
export function StatusBadge({status}: {status: ProjectDocument['status']}) {
  const Icon = status === 'indexed' ? CheckCircle2 : status === 'error' ? AlertCircle : Clock3;
  return <span className={`badge ${status}`}><Icon size={13}/>{status === 'indexed' ? 'Indexed' : status === 'error' ? 'Failed' : 'Processing'}</span>;
}
export function DocumentTable({documents, caption = 'Project source documents', compact = false}: {documents: ProjectDocument[]; caption?: string; compact?: boolean}) {
  return documents.length ? <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}><table className={compact ? 'compact-table' : undefined}><caption className="sr-only">{caption}</caption><thead><tr><th scope="col">Source document</th>{!compact && <th scope="col">Format</th>}<th scope="col">Status</th><th scope="col">Passages</th>{!compact && <th scope="col">Uploaded</th>}</tr></thead><tbody>{documents.map(doc => <tr key={doc.id}><td><div className="filename"><span className="file-icon"><FileText size={19}/></span><div><strong>{doc.filename}</strong><small><FileSize bytes={doc.size_bytes}/></small>{doc.error && <span className="file-error">{doc.error}</span>}</div></div></td>{!compact && <td><span className="format">{doc.document_type.toUpperCase() || 'UNKNOWN'}</span></td>}<td><StatusBadge status={doc.status}/></td><td className="numeric">{doc.chunk_count}</td>{!compact && <td><time dateTime={doc.uploaded_at}>{new Date(doc.uploaded_at).toLocaleDateString()}</time></td>}</tr>)}</tbody></table></div> : <Empty title="Your documents will appear here">Upload project proposals, meeting notes, progress updates, or task lists to get started.</Empty>;
}
export function EvidenceReference({evidence, includeText = false}: {evidence: Evidence; includeText?: boolean}) {
  return <details className="evidence-reference"><summary><FileText size={15}/><span>{includeText ? `${evidence.filename} · ${evidence.location} · Chunk ${evidence.chunk_number}` : 'Evidence reference'}</span><ArrowRight size={14} className="details-arrow"/></summary>{includeText && <blockquote>{evidence.text}</blockquote>}<dl className="reference-facts"><div><dt>Evidence ID</dt><dd><code>{evidence.id}</code></dd></div><div><dt>Document ID</dt><dd><code>{evidence.document_id}</code></dd></div><div><dt>Source location</dt><dd>{evidence.document_type.toUpperCase()} · {evidence.location} · Chunk {evidence.chunk_number}</dd></div></dl></details>;
}
