import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,FileText,CheckCheck} from 'lucide-react';
import {api} from '../api';
import type {AgentKind,AgentResult,AgentAvailability,AgentFinding,Evidence,KnowledgeBase} from '../types';
import {Busy,Empty,ErrorNotice,PageHeading} from '../components/UI';

export const agentSpecs={
 scope:{title:'Scope & Deliverables',description:'Find the goals, dates, deliverables, and responsibilities stated in your sources.',query:'Review project goals, milestones, timelines, responsibilities, and deliverables.'},
 risk:{title:'Risk & Delivery',description:'Review documented schedule risks, dependency gaps, and delivery challenges.',query:'Review schedule risks, dependency gaps, delivery challenges, and the stated delivery forecast.'},
 blockers:{title:'Blockers & Actions',description:'Bring pending decisions, unresolved issues, and assigned actions into view.',query:'Review meeting notes and sprint updates for pending decisions, unresolved issues, and action items.'}
};
const labels:Record<string,string>={goals:'Project goals',milestones:'Milestones',timelines:'Timelines',responsibilities:'Responsibilities',deliverables:'Deliverables',schedule_risks:'Schedule risks',dependency_gaps:'Dependency gaps',delivery_challenges:'Delivery challenges',delivery_forecast:'Stated delivery outlook',pending_decisions:'Pending decisions',unresolved_issues:'Unresolved issues',action_items:'Action items'};

function FindingRow({finding:f,evidence:e}:{finding:AgentFinding;evidence:Evidence|undefined}){
 return <article className="finding-row"><div className="finding-header"><span className={`badge ${f.information_state==='known'?'indexed':'processing'}`}>{f.information_state==='known'?'Explicitly stated':'Some details unclear'}</span><span className="quote-label"><CheckCheck size={13}/>Quoted evidence</span></div><p className="finding-text">{f.quote}</p>
 <dl className="finding-facts">{(f.category==='action_items'||f.category==='responsibilities')&&<div><dt>Owner</dt><dd>{f.owner??'Not stated'}</dd></div>}{f.category==='action_items'&&<><div><dt>Due date</dt><dd>{f.due_date??'Not stated'}</dd></div><div><dt>Status</dt><dd>{f.source_status??'Not stated'}</dd></div></>}{f.dates.length>0&&f.category!=='action_items'&&<div><dt>Dates in source</dt><dd>{f.dates.join(' · ')}</dd></div>}{f.severity&&<div><dt>Stated severity</dt><dd>{f.severity}</dd></div>}</dl>
 {e&&<details className="finding-evidence"><summary><FileText size={14}/><span>{e.filename} · {e.location} · Chunk {e.chunk_number}</span></summary><p>{e.text}</p><code>{e.id}</code></details>}</article>
}

export default function AgentAnalysis({kind,kb}:{kind:AgentKind;kb:KnowledgeBase}){
 const spec=agentSpecs[kind];
 const [query,setQuery]=useState(spec.query),[provider,setProvider]=useState<AgentAvailability|null>(null),[result,setResult]=useState<AgentResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;api.agentStatus().then(p=>{if(active)setProvider(p);}).catch(()=>{if(active)setError('Analysis availability could not be checked. Reload the page or check the backend.');});return()=>{active=false;};},[]);
 async function run(){setBusy(true);setError('');setResult(null);try{setResult(await api.analyze(kind,query.trim()));}catch(e){setError(e instanceof Error?e.message:'Analysis could not be completed.');}finally{setBusy(false);}}
 const evidence=new Map(result?.evidence.map(e=>[e.id,e])??[]);
 return <><PageHeading eyebrow="PROJECT ANALYSIS" title={spec.title} description={spec.description}/>
 <section className="panel analysis-controls"><div className="provider-status"><span className="badge neutral">{provider?.provider??'Checking availability…'}</span>{provider&&<span>{provider.message}</span>}</div><form onSubmit={e=>{e.preventDefault();void run();}}><label htmlFor="analysis-query">Analysis focus</label><textarea id="analysis-query" value={query} maxLength={500} rows={2} disabled={busy} onChange={e=>setQuery(e.target.value)}/><div className="analysis-action"><p>Findings use selected source passages. Unstated details stay unknown.</p><button className="button" disabled={busy||!kb.retrieval_ready||!provider?.ready||query.trim().length<2}>Run analysis <ArrowUpRight size={16}/></button></div></form></section>
 {!kb.retrieval_ready&&<section className="panel"><Empty title="Add project evidence first">Upload and index documents to start analysis. <Link className="text-link" to="/documents">Open Documents</Link></Empty></section>}
 {provider&&!provider.ready&&<ErrorNotice>{provider.message}</ErrorNotice>}{error&&<ErrorNotice>{error}</ErrorNotice>}{busy&&<Busy>Retrieving relevant passages and verifying each finding…</Busy>}
 {!result&&!busy&&kb.retrieval_ready&&!error&&<section className="panel"><Empty title="Ready to review your project">Run this agent to organize the facts supported by your documents.</Empty></section>}
 {result&&<><div className="analysis-result-heading"><h2>{result.status==='insufficient_information'?'Insufficient information':result.status==='partial'?'Analysis complete · partial information':'Analysis complete'}</h2><span>{result.findings.length} findings · {result.retrieved_count} passages reviewed</span></div><p className="muted analysis-message">{result.message}</p>
 <div className="coverage" aria-label="Evidence coverage">{result.coverage.map(c=><a key={c.category} href={`#category-${c.category}`}><strong>{labels[c.category]}</strong><span className={`badge ${c.state==='known'?'indexed':c.state==='unclear'?'processing':'neutral'}`}>{c.state==='missing'?'Not found':c.state==='unclear'?'Unclear':'Found'} · {c.count}</span></a>)}</div>
 <section className="panel analysis-findings">{result.coverage.map(c=><section className="finding-category" id={`category-${c.category}`} key={c.category}><h3>{labels[c.category]}</h3>{result.findings.filter(f=>f.category===c.category).map((f,i)=><FindingRow key={`${f.evidence_id}-${i}`} finding={f} evidence={evidence.get(f.evidence_id)}/>)}{c.count===0&&<p className="missing-finding">Not established in the retrieved evidence. No information has been assumed.</p>}</section>)}</section><div className="analysis-notes">{result.warnings.map(w=><p key={w}>{w}</p>)}<small>Analyzed {new Date(result.generated_at).toLocaleString()} · {result.provider}</small></div></>}
 </>;
}
