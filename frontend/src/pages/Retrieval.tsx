import {useState} from 'react';
import {Search,ArrowUpRight,FileText} from 'lucide-react';
import type {KnowledgeBase,QueryResult} from '../types';
import {api} from '../api';
import {Busy,Empty,ErrorNotice,PageHeading} from '../components/UI';
export const exampleQueries=['What milestones are defined?','Who is responsible for the API work?','What are the major project blockers?'];
export default function Retrieval({kb}:{kb:KnowledgeBase}){
 const [query,setQuery]=useState(''),[result,setResult]=useState<QueryResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function search(text:string){if(text.trim().length<2)return;setQuery(text);setBusy(true);setError('');setResult(null);try{setResult(await api.query(text.trim()));}catch(e){setError(e instanceof Error?e.message:'Retrieval failed.');}finally{setBusy(false);}}
 return <><PageHeading eyebrow="SOURCE-BACKED SEARCH" title="Retrieval" description="Ask a question. Find the project passages that matter."/>
 <section className="panel search-panel"><form onSubmit={e=>{e.preventDefault();void search(query);}}><label htmlFor="query">What would you like to find?</label><div className="search-input"><Search size={21}/><input id="query" value={query} maxLength={1000} placeholder="e.g. Who is responsible for the API work?" onChange={e=>setQuery(e.target.value)} disabled={busy}/><button className="button" disabled={busy||query.trim().length<2}>Find evidence <ArrowUpRight size={16}/></button></div></form><div className="suggestions">{exampleQueries.map(q=><button key={q} disabled={busy} onClick={()=>void search(q)}>{q}</button>)}</div><p className="fine-print">Search returns original passages with source references. It does not generate an answer.</p></section>
 {busy&&<Busy>Searching indexed project documents…</Busy>}{error&&<ErrorNotice>{error}</ErrorNotice>}
 {result?.status==='insufficient_information'&&<section className="panel"><Empty title="Insufficient information">{result.message} Try a more specific question or add relevant documents.</Empty></section>}
 {result?.status==='ok'&&<section><div className="results-heading"><h2>{result.results.length} relevant passages</h2><span>For “{result.query}”</span></div><p className="fine-print">{result.message}</p>{result.results.map((r,i)=><article className="panel evidence" key={r.id}><header><div className="evidence-source"><span className="rank">{i+1}</span><FileText size={18}/><strong>{r.filename}</strong></div><span className="badge indexed">Similarity {r.similarity.toFixed(2)}</span></header><blockquote>{r.text}</blockquote><footer><span>{r.document_type.toUpperCase()} · {r.location} · Chunk {r.chunk_number}</span><details><summary>Evidence reference</summary><code>{r.id}</code></details></footer></article>)}</section>}
 {!result&&!busy&&!error&&<section className="panel"><Empty title={kb.retrieval_ready?'Your evidence starts with a question':'Build your knowledge base first'}>{kb.retrieval_ready?'Search timelines, responsibilities, tasks, or blockers across your indexed documents.':'Upload documents on the Documents page, then come back to search.'}</Empty></section>}</>;
}
