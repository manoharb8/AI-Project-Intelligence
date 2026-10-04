import {createContext, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {useSession} from '../SessionContext';
import {intelligenceApi as legacyIntelligenceApi} from './api';
import {useWorkspace} from '../workspaces/WorkspaceContext';
import {resultKey} from '../workspaces/types';
import {useLocation} from 'react-router-dom';
import {AutomaticResource} from './AutomaticResource';
import {DEFAULT_FOCUS, useAutomaticWork} from './useAutomaticWork';
import type {ChatTurn, ConversationMessage, DocumentationTab} from './types';

function useIntelligenceState() {
  const workspace=useWorkspace();
  const intelligenceApi=workspace?.intelligenceApi??legacyIntelligenceApi;
  const saved=workspace?.snapshot;
  const {revision, kb, provider, providerError, checkingProvider, uploading, uploadStage, refreshing, connectionError} = useSession();
  const {pathname} = useLocation();
  const sourcesChanging = uploadStage === 'indexing' || Boolean(kb?.documents.some(document => document.status === 'processing'));
  const ready = Boolean((!workspace||workspace.active) && kb?.retrieval_ready && provider?.ready && !providerError && !checkingProvider && !uploading && !sourcesChanging && !refreshing && !connectionError);
  const environment = useRef({revision, ready, sourcesChanging});
  environment.current = {revision, ready, sourcesChanging};
  const [resources] = useState(() => {
    const value={
    documentation: new AutomaticResource(intelligenceApi.documentation, () => environment.current),
    health: new AutomaticResource(intelligenceApi.health, () => environment.current),
    outlook: new AutomaticResource((query: string) => intelligenceApi.assistant(query, []), () => environment.current),
    blockers: new AutomaticResource((query: string) => intelligenceApi.assistant(query, []), () => environment.current),
    };
    for(const entry of saved?.results??[]){
      const restoredRevision=entry.source_version===saved?.source_version?0:-1;
      if(entry.kind==='documentation')value.documentation.restore(entry.query,entry.result,restoredRevision);
      if(entry.kind==='health')value.health.restore(entry.query,entry.result,restoredRevision);
      if(entry.kind==='assistant'&&!entry.history.length){
        if(entry.query==='Are we on track?')value.outlook.restore(entry.query,entry.result,restoredRevision);
        if(entry.query==='What is blocking the project?')value.blockers.restore(entry.query,entry.result,restoredRevision);
      }
    }
    return value;
  });
  const sourceVersion = useRef({revision, sourcesChanging});
  useEffect(() => {
    if (sourceVersion.current.revision !== revision || (sourcesChanging && !sourceVersion.current.sourcesChanging)) {
      Object.values(resources).forEach(resource => resource.invalidate());
    }
    sourceVersion.current = {revision, sourcesChanging};
  }, [revision, sourcesChanging, resources]);
  const documentation = useAutomaticWork(resources.documentation, DEFAULT_FOCUS, pathname === '/documentation', ready, revision,saved?{query:saved.view.documentation_query,focus:saved.view.documentation_focus}:undefined);
  const health = useAutomaticWork(resources.health, DEFAULT_FOCUS, pathname === '/project-health', ready, revision,saved?{query:saved.view.health_query,focus:saved.view.health_focus}:undefined);
  const briefingActive = pathname === '/assistant' || pathname === '/dashboard';
  // Broad briefing results reuse the same cache as default Studio/Health views.
  // Custom review focuses remain separate, so a narrow view cannot hide evidence.
  const briefingDocumentation = useAutomaticWork(resources.documentation, DEFAULT_FOCUS, briefingActive, ready, revision);
  const briefingHealth = useAutomaticWork(resources.health, DEFAULT_FOCUS, briefingActive, ready, revision);
  const outlook = useAutomaticWork(resources.outlook, 'Are we on track?', briefingActive, ready, revision);
  const blockers = useAutomaticWork(resources.blockers, 'What is blocking the project?', briefingActive, ready, revision);
  const staleDuringIndexing = <T extends {stale: boolean; result: unknown}>(work: T): T => ({...work, stale: work.stale || Boolean(work.result && sourcesChanging)});
  const briefing = {documentation: staleDuringIndexing(briefingDocumentation), health: staleDuringIndexing(briefingHealth), outlook: staleDuringIndexing(outlook), blockers: staleDuringIndexing(blockers)};
  const [docTab, setDocTab] = useState<DocumentationTab>(saved?.view.doc_tab??'user_stories');
  const [docFilter, setDocFilter] = useState(saved?.view.doc_filter??'');
  const [actionFilter, setActionFilter] = useState(saved?.view.action_filter??'all');
  const [question, setQuestion] = useState(saved?.view.assistant_draft??'');
  const [turns, setTurns] = useState<ChatTurn[]>(()=> (saved?.view.turns??[]).map(turn=>{
    const entry=saved?.results.find(item=>item.kind==='assistant'&&item.key===turn.result_key);
    const answer=entry?.kind==='assistant'?entry:undefined;
    return {id:turn.id,question:turn.question,history:answer?.history??[],revision:answer?.source_version===saved?.source_version?0:-1,result:answer?.result??null,error:answer?'':turn.error||'This earlier request did not complete. Retry to prepare an answer.',pending:false};
  }));
  const [busy, setBusy] = useState(false);
  const turnsRef = useRef<ChatTurn[]>(turns);
  const busyRef = useRef(false);
  const serial = useRef(0);
  const nextId = useRef(Math.max(0,...turns.map(turn=>turn.id))+1);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => {serial.current += 1; controller.current?.abort();}, []);
  useEffect(()=>workspace?.persistence.update({documentation_query:documentation.query,documentation_focus:documentation.focus,health_query:health.query,health_focus:health.focus,doc_tab:docTab,doc_filter:docFilter,action_filter:actionFilter,assistant_draft:question,turns:turns.map(turn=>({id:turn.id,question:turn.question,result_key:turn.result?resultKey('assistant',turn.question,turn.history):null,error:turn.error}))}),[workspace?.persistence,documentation.query,documentation.focus,health.query,health.focus,docTab,docFilter,actionFilter,question,turns]);
  function update(fn: (previous: ChatTurn[]) => ChatTurn[]) {
    turnsRef.current = fn(turnsRef.current);
    setTurns(turnsRef.current);
  }
  async function execute(turn: ChatTurn) {
    if (busyRef.current || !ready) return;
    busyRef.current = true;
    setBusy(true);
    const run = ++serial.current;
    const abort = new AbortController();
    controller.current = abort;
    update(previous => previous.some(item => item.id === turn.id) ? previous.map(item => item.id === turn.id ? {...turn, pending: true, error: ''} : item) : [...previous, turn]);
    try {
      const result = await intelligenceApi.assistant(turn.question, turn.history, abort.signal);
      if (serial.current === run && environment.current.revision === turn.revision && !environment.current.sourcesChanging) update(previous => previous.map(item => item.id === turn.id ? {...item, result, pending: false, error: ''} : item));
      else if (serial.current === run) update(previous => previous.map(item => item.id === turn.id ? {...item, pending: false, error: 'Sources changed while this answer was being prepared. Retry for current evidence.'} : item));
    } catch (error) {
      if (serial.current === run) update(previous => previous.map(item => item.id === turn.id ? {...item, pending: false, error: error instanceof Error ? error.message : 'The answer could not be retrieved. Please try again.'} : item));
    } finally {
      if (serial.current === run) {busyRef.current = false; setBusy(false); controller.current = null;}
    }
  }
  function send(value = question) {
    const text = value.trim();
    if (busyRef.current || !ready || text.length < 2 || text.length > 1000) return;
    const history: ConversationMessage[] = turnsRef.current.filter(turn => turn.result && turn.revision === revision).slice(-6).flatMap(turn => [
      {role: 'user' as const, content: turn.question},
      {role: 'assistant' as const, content: turn.result!.answer.slice(0, 2000)},
    ]);
    const turn: ChatTurn = {id: nextId.current++, question: text, history, revision, result: null, error: '', pending: true};
    setQuestion('');
    void execute(turn);
  }
  function retry(id: number) {
    const turn = turnsRef.current.find(item => item.id === id);
    if (turn && !busyRef.current) void execute({...turn, revision, history: turn.revision === revision ? turn.history : [], pending: true});
  }
  function clearConversation() {
    serial.current += 1;
    controller.current?.abort();
    controller.current = null;
    busyRef.current = false;
    setBusy(false);
    setQuestion('');
    update(() => []);
  }
  return {documentation: staleDuringIndexing(documentation), health: staleDuringIndexing(health), briefing, ready, docTab, setDocTab, docFilter, setDocFilter, actionFilter, setActionFilter,
    question, setQuestion, turns, busy, send, retry, clearConversation};
}
const IntelligenceContext = createContext<ReturnType<typeof useIntelligenceState> | null>(null);
export function IntelligenceProvider({children}: {children: ReactNode}) {
  const value = useIntelligenceState();
  return <IntelligenceContext.Provider value={value}>{children}</IntelligenceContext.Provider>;
}
export function useIntelligence() {
  const value = useContext(IntelligenceContext);
  if (!value) throw new Error('IntelligenceProvider is required.');
  return value;
}
