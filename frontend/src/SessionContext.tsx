import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {api as legacyApi} from './api';
import {useWorkspace} from './workspaces/WorkspaceContext';
import {agentSpecs} from './agentSpecs';
import {appendFiles, fileKey} from './fileQueue';
import {uploadIdentity} from './uploadIdentity';
import type {AgentAvailability, AgentResult, KnowledgeBase, ProjectDocument, QueryResult} from './types';

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

/** Workspace-local request state survives navigation; completed results can hydrate from the backend. */
export function useWork<T>(initialQuery: string, request: (query: string) => Promise<T>, saved?: {result:T; resultRevision:number}) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<T | null>(saved?.result??null);
  const [resultRevision, setResultRevision] = useState(saved?.resultRevision??-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const serial = useRef(0);
  useEffect(() => () => {serial.current += 1;}, []);
  async function run(text: string, revision: number) {
    if (locked.current || text.trim().length < 2) return;
    locked.current = true;
    const id = ++serial.current;
    setQuery(text);
    setBusy(true);
    setError('');
    try {
      const value = await request(text.trim());
      if (id === serial.current) {setResult(value); setResultRevision(revision);}
    } catch (error) {
      if (id === serial.current) setError(errorMessage(error, 'The request could not be completed. Please try again.'));
    } finally {
      if (id === serial.current) {locked.current = false; setBusy(false);}
    }
  }
  return {query, setQuery, result, resultRevision, busy, error, run};
}

function useSessionState() {
  const workspace=useWorkspace();
  const api=workspace?.api??legacyApi;
  const restored=workspace?.snapshot;
  const last=(kind:string)=>restored?.results.filter(item=>item.kind===kind).at(-1);
  const retrievalSaved=last('retrieval'),scopeSaved=last('scope'),riskSaved=last('risk'),blockersSaved=last('blockers');
  const restore=<T,>(entry:{result:T;source_version:string}|undefined)=>entry?{result:entry.result,resultRevision:entry.source_version===restored?.source_version?0:-1}:undefined;
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const summarySerial = useRef(0);
  const [provider, setProvider] = useState<AgentAvailability | null>(null);
  const [providerError, setProviderError] = useState('');
  const [checkingProvider, setCheckingProvider] = useState(false);
  const providerSerial = useRef(0);
  const providerLock = useRef(false);
  const active = useRef(true);
  const [revision, setRevision] = useState(0);
  const indexedSnapshot = useRef<Map<string, number> | null>(restored?new Map(Object.entries(restored.indexed_sources)):null);
  const retrieval = useWork<QueryResult>(restored?.view.retrieval_query??'', api.query,restore(retrievalSaved?.kind==='retrieval'?retrievalSaved:undefined));
  const scope = useWork<AgentResult>(restored?.view.scope_query||agentSpecs.scope.query, query => api.analyze('scope', query),restore(scopeSaved?.kind==='scope'?scopeSaved:undefined));
  const risk = useWork<AgentResult>(restored?.view.risk_query||agentSpecs.risk.query, query => api.analyze('risk', query),restore(riskSaved?.kind==='risk'?riskSaved:undefined));
  const blockers = useWork<AgentResult>(restored?.view.blockers_query||agentSpecs.blockers.query, query => api.analyze('blockers', query),restore(blockersSaved?.kind==='blockers'?blockersSaved:undefined));
  useEffect(()=>workspace?.persistence.update({retrieval_query:retrieval.query,scope_query:scope.query,risk_query:risk.query,blockers_query:blockers.query}),[workspace?.persistence,retrieval.query,scope.query,risk.query,blockers.query]);
  const [files, setFiles] = useState<File[]>([]);
  const filesRef = useRef<File[]>([]);
  const [queueMessages, setQueueMessages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<'idle' | 'checking' | 'indexing'>('idle');
  const indexedUploads = useRef(new Map<string, string>());
  const uploadLock = useRef(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadHasFailures, setUploadHasFailures] = useState(false);
  const [uploadResults, setUploadResults] = useState<ProjectDocument[]>([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentStatus, setDocumentStatus] = useState('all');
  const [documentSort, setDocumentSort] = useState('newest');

  const observeIndexedSources = useCallback((documents: ProjectDocument[], fullSnapshot: boolean) => {
    const previous = indexedSnapshot.current;
    const next = fullSnapshot ? new Map<string, number>() : new Map(previous ?? []);
    for (const document of documents) {
      if (document.indexed) next.set(document.id, document.chunk_count);
    }
    if (previous && (previous.size !== next.size || [...next].some(([id, count]) => previous.get(id) !== count))) {
      setRevision(value => value + 1);
    }
    indexedSnapshot.current = next;
  }, []);

  const refresh = useCallback(async () => {
    const id = ++summarySerial.current;
    setRefreshing(true);
    try {
      const value = await api.summary();
      if (active.current && id === summarySerial.current) {
        observeIndexedSources(value.documents, true);
        setKb(value);
        const indexedIds = new Set(value.documents.filter(document => document.indexed).map(document => document.id));
        for (const [identity, documentId] of indexedUploads.current) if (!indexedIds.has(documentId)) indexedUploads.current.delete(identity);
        setConnectionError('');
      }
    } catch (error) {
      if (active.current && id === summarySerial.current) setConnectionError(errorMessage(error, 'Cannot connect to the backend.'));
    } finally {
      if (active.current && id === summarySerial.current) setRefreshing(false);
    }
  }, [observeIndexedSources,api]);

  const checkProvider = useCallback(async () => {
    if (providerLock.current) return;
    providerLock.current = true;
    const id = ++providerSerial.current;
    setCheckingProvider(true);
    setProviderError('');
    try {
      const value = await api.agentStatus();
      if (active.current && id === providerSerial.current) setProvider(value);
    } catch (error) {
      if (active.current && id === providerSerial.current) {setProvider(null); setProviderError(errorMessage(error, 'Analysis availability could not be checked. Try checking again.'));}
    } finally {
      if (active.current && id === providerSerial.current) {providerLock.current = false; setCheckingProvider(false);}
    }
  }, [api]);

  useEffect(() => {
    active.current = true;
    void refresh();
    void checkProvider();
    return () => {active.current = false; summarySerial.current++; providerSerial.current++; providerLock.current = false;};
  }, [refresh, checkProvider]);
  const wasSelected=useRef(workspace?.active);
  useEffect(()=>{if(workspace?.active&&!wasSelected.current){void refresh();void checkProvider();}wasSelected.current=workspace?.active;},[workspace?.active,refresh,checkProvider]);

  function selectFiles(incoming: File[]) {
    if (uploadLock.current) return;
    const selection = appendFiles(filesRef.current, incoming);
    filesRef.current = selection.files;
    setFiles(selection.files);
    setQueueMessages(selection.messages);
    setUploadError('');
    setUploadMessage('');
    setUploadResults([]);
  }
  function removeFile(key: string) {
    if (uploadLock.current) return;
    filesRef.current = filesRef.current.filter(file => fileKey(file) !== key);
    setFiles(filesRef.current);
    setQueueMessages([]);
  }
  async function upload() {
    if (uploadLock.current || !filesRef.current.length) return;
    uploadLock.current = true;
    setUploading(true);
    setUploadStage('checking');
    setUploadError('');
    setUploadMessage('');
    setUploadResults([]);
    setQueueMessages([]);
    const selected = [...filesRef.current];
    let polling: ReturnType<typeof setInterval> | undefined;
    try {
      const identities = await Promise.all(selected.map(uploadIdentity));
      if (!active.current) return;
      const seen = new Set(indexedUploads.current.keys());
      const pending: {file: File; identity: string | null}[] = [];
      const skipped: string[] = [];
      selected.forEach((file, index) => {
        const identity = identities[index];
        if (identity && seen.has(identity)) skipped.push(file.name);
        else {pending.push({file, identity}); if (identity) seen.add(identity);}
      });
      if (skipped.length) setQueueMessages(skipped.map(name => `${name}: identical content was already indexed in this session or selected in this batch; skipped.`));
      if (!pending.length) {
        filesRef.current = []; setFiles([]); setUploadHasFailures(false);
        setUploadMessage('No new files were sent. Identical content is already indexed in this session.');
        return;
      }
      setUploadStage('indexing');
      polling = setInterval(() => {if (active.current) void refresh();}, 1500);
      const result = await api.upload(pending.map(item => item.file));
      if (!active.current) return;
      result.documents.forEach((doc, index) => {
        const identity = pending[index]?.identity;
        if (doc.indexed && identity) indexedUploads.current.set(identity, doc.id);
      });
      const indexed = result.documents.filter(doc => doc.indexed).length;
      const failed = result.documents.some(doc => doc.status === 'error');
      setUploadHasFailures(failed);
      setUploadResults(result.documents);
      setUploadMessage(`${indexed} of ${result.documents.length} documents indexed. ${failed ? 'Review failed files below, correct the source, then choose the file again.' : indexed ? 'Ready for evidence search.' : 'Check the document statuses below.'}`);
      observeIndexedSources(result.documents, false);
      filesRef.current = [];
      setFiles([]);
      await refresh();
    } catch (error) {
      if (active.current) setUploadError(`${errorMessage(error, 'Upload failed.')} Your queue is kept. Refresh the document list before retrying to check whether any files were received.`);
    } finally {
      if (polling !== undefined) clearInterval(polling);
      uploadLock.current = false;
      if (active.current) {setUploading(false); setUploadStage('idle');}
    }
  }
  return {kb, connectionError, refreshing, refresh, provider, providerError, checkingProvider, checkProvider, revision,
    retrieval, agents: {scope, risk, blockers}, files, queueMessages, uploading, uploadStage, uploadError, uploadMessage, uploadHasFailures, uploadResults, selectFiles, removeFile, upload,
    documentSearch, setDocumentSearch, documentStatus, setDocumentStatus, documentSort, setDocumentSort};
}

const SessionContext = createContext<ReturnType<typeof useSessionState> | null>(null);
export function SessionProvider({children}: {children: ReactNode}) {
  const state = useSessionState();
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('SessionProvider is required.');
  return session;
}
