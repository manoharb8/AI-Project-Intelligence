import {Link} from 'react-router-dom';
import {FileText, Database, Layers, Upload} from 'lucide-react';
import type {KnowledgeBase} from '../types';
import {PageHeading} from '../components/UI';
import ProjectInsights from '../dashboard/ProjectInsights';
import '../dashboard/executive.css';

export function Stats({kb}: {kb: KnowledgeBase}) {
  const stats = [
    {label: 'Documents', value: kb.document_count, caption: 'Uploaded sources', icon: FileText},
    {label: 'Indexed', value: kb.indexed_documents, caption: 'Searchable documents', icon: Database},
    {label: 'Passages', value: kb.chunk_count, caption: 'Traceable excerpts', icon: Layers},
  ];
  return <dl className="stats" aria-label="Knowledge base statistics">{stats.map(stat => <div key={stat.label}><dt><stat.icon size={18}/><span>{stat.label}</span></dt><dd>{stat.value}</dd><p>{stat.caption}</p></div>)}</dl>;
}

export default function Overview({kb}: {kb: KnowledgeBase}) {
  return <div className="overview-page executive-overview">
    <PageHeading eyebrow="Overview" title="Your project, in focus." description={`${kb.document_count} source documents · ${kb.indexed_documents} indexed · ${kb.chunk_count} traceable passages`} action={<Link to="/documents" className="button"><Upload size={16}/>Add documents</Link>}/>
    <ProjectInsights/>
  </div>;
}
