import {Link} from 'react-router-dom';
import {ArrowRight, ArrowUpRight, FileText, Database, Search, Target, TriangleAlert, ListChecks, Upload, CheckCircle2, CircleDashed, Layers} from 'lucide-react';
import type {AgentKind, KnowledgeBase} from '../types';
import {DocumentTable, PageHeading, Timestamp} from '../components/UI';
import {useSession} from '../SessionContext';
import {agentSpecs} from '../agentSpecs';

export function Stats({kb}: {kb: KnowledgeBase}) {
  const stats = [
    {label: 'Documents', value: kb.document_count, caption: 'Uploaded sources', icon: FileText},
    {label: 'Indexed', value: kb.indexed_documents, caption: 'Searchable documents', icon: Database},
    {label: 'Passages', value: kb.chunk_count, caption: 'Traceable excerpts', icon: Layers},
  ];
  return <dl className="stats" aria-label="Knowledge base statistics">{stats.map(stat => <div key={stat.label}><dt><stat.icon size={18}/><span>{stat.label}</span></dt><dd>{stat.value}</dd><p>{stat.caption}</p></div>)}</dl>;
}

export default function Overview({kb}: {kb: KnowledgeBase}) {
  const {agents, revision, provider, providerError, checkingProvider} = useSession();
  const completed = Object.values(agents).some(agent => agent.result);
  const icons = {scope: Target, risk: TriangleAlert, blockers: ListChecks};
  const descriptions = {scope: 'Understand what needs to be delivered, when, and by whom.', risk: 'Surface documented risks, dependencies, and delivery challenges.', blockers: 'Bring unresolved decisions and the next actions into focus.'};
  const topics = {scope: 'Goals · milestones · responsibilities', risk: 'Schedule · dependencies · outlook', blockers: 'Decisions · owners · due dates'};
  const providerUnavailable = Boolean(providerError || (provider && !provider.ready));
  return <div className="overview-page">
    <PageHeading eyebrow="Project workspace" title="Your project, in focus." description="The context you need. The evidence to back it up." action={<Link to="/documents" className="button"><Upload size={16}/>Add documents</Link>}/>
    <div className="overview-top-grid">
      <section className="workspace-brief" aria-labelledby="workspace-brief-title">
        <div className="brief-kicker"><span className="brief-icon"><Search size={17}/></span><span>{kb.retrieval_ready ? 'Your evidence workspace' : 'Start with your sources'}</span></div>
        <h2 id="workspace-brief-title">{kb.retrieval_ready ? 'Find the context behind every decision.' : kb.document_count ? 'Get your sources ready for search.' : 'Great project insights start here.'}</h2>
        <p>{kb.retrieval_ready ? 'Explore original passages, then let a focused agent organize what they establish.' : kb.document_count ? 'Review processing and failed files to make your project evidence searchable.' : 'Add proposals, meeting notes, sprint updates, or task lists to get started.'}</p>
        <div className="brief-actions"><Link className="button" to={kb.retrieval_ready ? '/retrieval' : '/documents'}>{kb.retrieval_ready ? 'Explore evidence' : 'Open Documents'}<ArrowRight size={16}/></Link><Link className="brief-link" to="/knowledge-base">Knowledge Base<ArrowUpRight size={15}/></Link></div>
      </section>
      <div className="overview-snapshot"><div className="snapshot-heading"><h2>Source overview</h2><span className={`readiness-label ${kb.retrieval_ready ? 'ready' : ''}`}>{kb.retrieval_ready ? <CheckCircle2 size={14}/> : <CircleDashed size={14}/>} {kb.retrieval_ready ? 'Evidence ready' : 'Indexing required'}</span></div><Stats kb={kb}/><p className="snapshot-note">{kb.retrieval_ready ? 'Indexed sources are available for search and analysis.' : 'Counts update as your sources are uploaded and indexed.'}</p></div>
    </div>
    <section className="analysis-hub" aria-labelledby="analysis-hub-title"><div className="section-heading plain"><div><h2 id="analysis-hub-title">Choose your perspective</h2><p className="muted">Three agents. One connected body of project evidence.</p></div><span className="section-meta">{completed ? 'Results from this session' : 'Analysis runs on request'}</span></div><div className="agent-cards">{(Object.keys(agentSpecs) as AgentKind[]).map((kind, index) => {
      const spec = agentSpecs[kind], state = agents[kind], Icon = icons[kind];
      const resultStatus = state.resultRevision < revision ? 'May be out of date' : state.result?.status === 'insufficient_information' ? 'Insufficient information' : state.result?.status === 'partial' ? 'Partial information' : 'Analysis complete';
      const nextAction = !kb.retrieval_ready ? 'Add indexed sources first' : providerUnavailable ? 'Check analysis availability' : checkingProvider ? 'Checking availability' : 'Open analysis';
      return <Link className={`agent-card agent-${kind}`} key={kind} to={spec.path} aria-labelledby={`agent-title-${kind}`}>
        <div className="agent-card-top"><span className="agent-icon"><Icon size={23}/></span><span className="agent-index">0{index + 1}<span> / ANALYSIS</span></span><ArrowUpRight className="agent-open" size={18}/></div>
        <h3 id={`agent-title-${kind}`}>{spec.title}</h3><p className="agent-description">{descriptions[kind]}</p><p className="agent-topics">{topics[kind]}</p>
        <div className="agent-card-bottom"><div>{state.busy ? <span className="badge processing">Analysis running</span> : state.result ? <><span className="agent-finding-count">{state.result.findings.length} {state.result.findings.length === 1 ? 'finding' : 'findings'}</span><small>{resultStatus}</small></> : <><span className="badge neutral">Not analyzed</span><small>{nextAction}</small></>}</div><ArrowRight size={17}/></div>
        {state.result && <p className="agent-generated">Generated <Timestamp value={state.result.generated_at}/></p>}
      </Link>;
    })}</div></section>
    <div className="overview-bottom-grid">
      <section className="panel recent-sources"><div className="section-heading"><div><h2>Recent sources</h2><p className="muted">The documents behind your project insights.</p></div><Link to="/documents" className="text-link">View all<ArrowRight size={15}/></Link></div><DocumentTable documents={[...kb.documents].sort((a, b) => Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at)).slice(0, 5)} caption="Recent source documents" compact/></section>
      <section className="workflow" aria-labelledby="workflow-title"><div className="section-heading plain"><div><p className="eyebrow">The workflow</p><h2 id="workflow-title">Connected from the source.</h2></div></div><ol className="journey-steps">{[
        {icon: FileText, title: 'Bring your sources', body: 'PDF, DOCX, TXT, and CSV.', to: '/documents', link: 'Manage documents'},
        {icon: Database, title: 'Check evidence readiness', body: 'Review your indexed documents.', to: '/knowledge-base', link: 'View knowledge base'},
        {icon: Search, title: 'Search, then analyze', body: 'Trace insights to original passages.', to: '/retrieval', link: 'Open Evidence Search'},
      ].map(step => <li key={step.to}><span className="step-icon"><step.icon size={18}/></span><div><h3>{step.title}</h3><p>{step.body}</p><Link className="text-link" to={step.to}>{step.link}<ArrowRight size={14}/></Link></div></li>)}</ol><p className="workflow-footnote"><CheckCircle2 size={16}/>Missing information stays unknown.</p></section>
    </div>
    <p className="trust-note"><CheckCircle2 size={16}/>Every finding stays connected to its evidence. Missing evidence is never an all-clear.</p>
  </div>;
}
