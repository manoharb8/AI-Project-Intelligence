import {Link} from 'react-router-dom';
import {Search, ArrowRight, FileText, Info} from 'lucide-react';
import type {KnowledgeBase} from '../types';
import {Busy, Empty, ErrorNotice, EvidenceReference, Notice, PageHeading} from '../components/UI';
import {useSession} from '../SessionContext';

export const exampleQueries = ['What milestones are defined?', 'Who is responsible for the API work?', 'What are the major project blockers?'];
export default function Retrieval({kb}: {kb: KnowledgeBase}) {
  const {retrieval: state, revision} = useSession();
  const {query, setQuery, result, busy, error} = state;
  function search(text: string) {if (kb.retrieval_ready && !busy) void state.run(text, revision);}
  return <>
    <PageHeading eyebrow="Sources & Search" title="Evidence Search" description="Find the original project passages that help answer your question."/>
    <section className="panel search-panel"><form onSubmit={event => {event.preventDefault(); search(query);}}><label htmlFor="query">What would you like to find?</label><div className="search-input"><Search size={22}/><input id="query" value={query} maxLength={1000} placeholder="e.g. Who is responsible for the API work?" onChange={event => setQuery(event.target.value)} disabled={busy} aria-describedby="search-help"/><button className="button" disabled={busy || !kb.retrieval_ready || query.trim().length < 2}>{busy ? 'Finding evidence…' : 'Find evidence'}<ArrowRight size={17}/></button></div><p id="search-help" className="field-help">{!kb.retrieval_ready ? 'Upload and index project documents before searching.' : 'Enter at least 2 characters to search your indexed sources.'}</p></form><div className="suggestions" aria-label="Suggested questions">{exampleQueries.map(question => <button key={question} disabled={busy || !kb.retrieval_ready} onClick={() => search(question)}>{question}<ArrowRight size={14}/></button>)}</div><p className="search-explanation"><Info size={17}/><span>These results are retrieved source passages, not generated answers.</span></p></section>
    {!kb.retrieval_ready && <section className="panel"><Empty title="Build your knowledge base first" action={<Link className="button" to="/documents">Open Documents<ArrowRight size={16}/></Link>}>Upload and index project documents to make evidence search available.</Empty></section>}
    {busy && <Busy>Searching indexed project documents…{result && ' Previous results remain below while the search runs.'}</Busy>}
    {result && !busy && !error && <p className="sr-only" role="status">{result.status === 'insufficient_information' ? 'Search complete. Insufficient information.' : `Search complete. ${result.results.length} source passages retrieved.`}</p>}
    {error && <ErrorNotice><p>{error}</p><button className="button secondary notice-action" disabled={busy || !kb.retrieval_ready} onClick={() => search(query)}>Retry search</button></ErrorNotice>}
    {result && state.resultRevision < revision && <Notice tone="warning">Documents were indexed after this search began. Search again to include the latest evidence.</Notice>}
    {result && <section aria-label="Search results"><div className="results-heading"><div><p className="eyebrow">Retrieved source evidence</p><h2>{result.status === 'insufficient_information' ? 'Insufficient information' : `${result.results.length} relevant passages`}</h2></div><span className="badge neutral">Source passages</span></div><p className="result-query">Results for “{result.query}”</p><p className="muted result-message">{result.message}</p>
      {result.status === 'insufficient_information' && <div className="panel"><Empty title="No matching evidence established" action={<Link className="text-link" to="/documents">Add relevant documents<ArrowRight size={16}/></Link>}>Try a more specific question or add relevant sources. Missing evidence does not establish that there are no risks or blockers.</Empty></div>}
      {result.results.length > 0 && <p className="fine-print similarity-help"><Info size={15}/>Similarity measures semantic closeness to your query. It is not factual confidence or a probability.</p>}
      {result.results.map((evidence, index) => <article className="panel evidence" key={evidence.id}><header><div className="evidence-source"><span className="rank">{index + 1}</span><FileText size={18}/><strong>{evidence.filename}</strong></div><span className="badge neutral">Similarity {evidence.similarity.toFixed(2)}</span></header><p className="source-location">{evidence.document_type.toUpperCase()} · {evidence.location} · Chunk {evidence.chunk_number}</p><blockquote>{evidence.text}</blockquote><EvidenceReference evidence={evidence}/></article>)}
    </section>}
    {!result && !busy && !error && kb.retrieval_ready && <section className="panel"><Empty title="Your evidence starts with a question">Search timelines, responsibilities, tasks, or blockers across your indexed documents.</Empty></section>}
  </>;
}
