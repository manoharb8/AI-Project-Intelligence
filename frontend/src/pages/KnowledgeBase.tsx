import {Link} from 'react-router-dom';
import {ArrowRight, Database, FileText, Search, CheckCircle2} from 'lucide-react';
import type {KnowledgeBase as KB} from '../types';
import {DocumentTable, Empty, PageHeading} from '../components/UI';
import {Stats} from './Overview';

export default function KnowledgeBase({kb}: {kb: KB}) {
  return <>
    <PageHeading eyebrow="Sources & Search" title="Knowledge Base" description="Understand which sources are indexed and ready to provide evidence." action={<Link className={`button ${kb.retrieval_ready ? '' : 'secondary'}`} to={kb.retrieval_ready ? '/retrieval' : '/documents'}>{kb.retrieval_ready ? <Search size={17}/> : <FileText size={17}/>} {kb.retrieval_ready ? 'Find evidence' : 'Open Documents'}</Link>}/>
    <Stats kb={kb}/>
    <section className="readiness"><span className="readiness-icon"><Database size={24}/></span><div><h2>{kb.retrieval_ready ? 'Your evidence is ready to search' : 'Indexed evidence is not ready yet'}</h2><p>{kb.retrieval_ready ? 'The indexed sources below can supply passages for evidence search and project analysis.' : kb.document_count ? 'Check processing and failed files in Documents. Search requires indexed evidence.' : 'Add project documents to create a searchable knowledge base.'}</p></div><span className={`badge ${kb.retrieval_ready ? 'indexed' : 'neutral'}`}>{kb.retrieval_ready && <CheckCircle2 size={13}/>} {kb.retrieval_ready ? 'Retrieval available' : 'Awaiting indexed evidence'}</span></section>
    <section className="panel"><div className="section-heading"><div><h2>Indexed source documents</h2><p className="muted">Documents manages uploads. This view shows sources available as evidence.</p></div><span className="count">{kb.indexed_documents} indexed</span></div>{kb.documents.some(doc => doc.indexed) ? <DocumentTable documents={[...kb.documents].filter(doc => doc.indexed).sort((a, b) => Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at))} caption="Indexed source documents"/> : <Empty title="No indexed sources yet" action={<Link className="button secondary" to="/documents">Open Documents<ArrowRight size={16}/></Link>}>Upload a readable project document or review the status of your existing uploads.</Empty>}</section>
    <div className="kb-note"><FileText size={23}/><div><h3>Every passage has a source</h3><p>Evidence includes its filename, source location, and passage reference so you can trace each finding. Indexing makes a source searchable; it does not mean the project has been analyzed.</p><p className="supported-formats">Supported formats: <strong>{kb.supported_formats.map(format => format.toUpperCase()).join(' · ')}</strong></p></div></div>
  </>;
}
