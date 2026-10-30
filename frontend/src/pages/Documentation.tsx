import {BookOpen, CheckCircle2, CircleHelp, FileText, ListChecks, Search, TriangleAlert} from 'lucide-react';
import {Empty, PageHeading} from '../components/UI';
import {useSession} from '../SessionContext';
import {useIntelligence} from '../intelligence/IntelligenceContext';
import {AutomaticControls, AvailabilityNotice, MethodNotes, ResultStamp, RunControls, RunFeedback, SourceQuotes, UnknownValue, WorkspaceTabs, useAvailability} from '../intelligence/Shared';
import type {DocumentationTab} from '../intelligence/types';
import {categoryLabels} from '../agentSpecs';

const tabs: {id: DocumentationTab; label: string}[] = [{id:'user_stories',label:'User Stories'},{id:'risks',label:'Risk Register'},{id:'action_items',label:'Action Items'}];

export default function Documentation() {
  const {revision, kb} = useSession();
  const {documentation: state, docTab, setDocTab, docFilter, setDocFilter, actionFilter, setActionFilter} = useIntelligence();
  const {result, query, setQuery, busy, error} = state;
  const unavailable = useAvailability(busy);
  const run = () => {if (!unavailable && query.trim().length >= 2) void state.run(query, revision);};
  const matches = (text: string) => text.toLocaleLowerCase().includes(docFilter.trim().toLocaleLowerCase());
  const stories = result?.user_stories.filter(item => matches([item.title,item.role,item.need,item.benefit].join(' '))) ?? [];
  const risks = result?.risks.filter(item => matches([item.description,item.impact,item.mitigation,item.status].join(' '))) ?? [];
  const actions = result?.action_items.filter(item => matches([item.description,item.owner,item.due_date,item.status].join(' ')) && (actionFilter !== 'missing' || item.owner === null || item.due_date === null)) ?? [];
  const visibleCount = docTab === 'user_stories' ? stories.length : docTab === 'risks' ? risks.length : actions.length;
  return <div className="intelligence-page documentation-page">
    <PageHeading eyebrow="Project Intelligence" title="Documentation Studio" description="Turn existing project evidence into reviewable stories, risks, and actions."/>
    <div className="intelligence-intro"><span className="studio-emblem"><BookOpen size={25}/></span><div><h2>From source material to working documents.</h2><p>Structured drafts with the evidence attached. Every unknown stays visible.</p></div><span className="intro-caption">THREE OUTPUTS · ONE KNOWLEDGE BASE</span></div>
    <AutomaticControls busy={busy} waiting={state.waiting} onRefresh={() => void state.refresh()}><RunControls query={query} onQuery={setQuery} busy={busy} onRun={run} action="Generate documentation"/></AutomaticControls>
    <AvailabilityNotice/>
    <RunFeedback busy={busy} error={error} retry={run} result={result} stale={state.stale} differentFocus={state.previousFocus} label="Reviewing scope, risks, and actions in your source documents…"/>
    {result && <ResultStamp result={result} label="Generated"/>}
    <section className="studio-workspace panel">
      <WorkspaceTabs tabs={tabs.map(tab => ({...tab, count: result?.[tab.id].length}))} value={docTab} onChange={setDocTab} label="Generated documentation"/>
      {result && <div className="studio-toolbar"><label className="studio-search"><Search size={16}/><span className="sr-only">Find generated items</span><input value={docFilter} onChange={event => setDocFilter(event.target.value)} placeholder="Find a requirement, risk, or owner…"/></label>{docTab === 'action_items' && <label className="compact-select">Show<select value={actionFilter} onChange={event => setActionFilter(event.target.value)}><option value="all">All actions</option><option value="missing">Missing owner or date</option></select></label>}<span>{visibleCount} shown</span></div>}
      <div role="tabpanel" id={`panel-${docTab}`} aria-labelledby={`tab-${docTab}`} tabIndex={0}>
        {!result && <div className="studio-blank"><div className="document-stack" aria-hidden="true"><FileText size={52}/><CheckCircle2 size={24}/></div><h2>Your next working draft starts here.</h2><p>{kb?.retrieval_ready ? 'Documentation prepares automatically when evidence and analysis are ready. You can customize the review focus above.' : 'Add indexed project documents to begin.'}</p><div className="studio-capabilities"><span><BookOpen size={16}/>Source-backed stories</span><span><TriangleAlert size={16}/>Documented risks</span><span><ListChecks size={16}/>Traceable actions</span></div></div>}
        {result && visibleCount === 0 && <Empty title={docFilter || (docTab === 'action_items' && actionFilter !== 'all') ? 'No matching items' : 'Not established in the retrieved evidence'}>{docFilter || actionFilter !== 'all' ? 'Adjust your filters to see other generated items.' : 'No entries have been invented to fill this section. Add relevant source material or refine the review focus.'}</Empty>}
        {result && docTab === 'user_stories' && <div className="story-list">{stories.map((story, index) => <article className="story-entry" key={story.id}><div className="entry-marker">US<span>{String(index+1).padStart(2,'0')}</span></div><div className="entry-content"><div className="entry-title"><h3>{story.title}</h3><span className={`badge ${story.information_state === 'explicit' ? 'indexed' : 'neutral'}`}>{story.information_state === 'explicit' ? <CheckCircle2 size={13}/> : <CircleHelp size={13}/>} {story.information_state === 'explicit' ? 'Explicit requirement' : 'Partial story'}</span></div><dl className="story-structure"><div><dt>Role / user</dt><dd><UnknownValue value={story.role}/></dd></div><div><dt>Need / action</dt><dd>{story.need}</dd></div><div><dt>Benefit / value</dt><dd><UnknownValue value={story.benefit}/></dd></div></dl><div className="acceptance"><h4>Acceptance criteria</h4>{story.acceptance_criteria.length ? <ul>{story.acceptance_criteria.map(text => <li key={text}>{text}</li>)}</ul> : <p className="unknown-value">Not stated</p>}</div><SourceQuotes references={story.references} evidence={result.evidence}/></div></article>)}</div>}
        {result && docTab === 'risks' && <div className="register-list">{risks.map((risk,index) => <article className="register-entry" key={risk.id}><header><span className="register-index">R{String(index+1).padStart(2,'0')}</span><div><div className="category-chips">{risk.categories.map(category => <span key={category}>{categoryLabels[category] ?? category}</span>)}</div><h3>{risk.description}</h3></div></header><dl className="register-facts"><div><dt>Stated impact</dt><dd><UnknownValue value={risk.impact}/></dd></div><div><dt>Stated likelihood</dt><dd><UnknownValue value={risk.likelihood}/></dd></div><div><dt>Source status</dt><dd><UnknownValue value={risk.status}/></dd></div><div><dt>Stated severity</dt><dd><UnknownValue value={risk.severity}/></dd></div></dl><div className="mitigation"><h4>Documented mitigation / action</h4><p><UnknownValue value={risk.mitigation}/></p></div><SourceQuotes references={risk.references} evidence={result.evidence}/></article>)}</div>}
        {result && docTab === 'action_items' && actions.length > 0 && <div className="table-scroll action-register" role="region" aria-label="Generated action items" tabIndex={0}><table><caption className="sr-only">Evidence-backed action item list</caption><thead><tr><th scope="col">Action & source</th><th scope="col">Owner</th><th scope="col">Due date</th><th scope="col">Source status</th></tr></thead><tbody>{actions.map(action => <tr key={action.id}><td><strong>{action.title}</strong>{action.title !== action.description && <p>{action.description}</p>}<p className="action-dependency">Dependency: <UnknownValue value={action.dependency}/></p><SourceQuotes references={action.references} evidence={result.evidence}/></td><td><UnknownValue value={action.owner}/></td><td><UnknownValue value={action.due_date}/></td><td><UnknownValue value={action.status}/></td></tr>)}</tbody></table></div>}
      </div>
    </section>
    {result && <MethodNotes warnings={result.warnings}/>}
  </div>;
}
