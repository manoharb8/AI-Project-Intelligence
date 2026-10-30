import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {createApi} from '../api';
import {createIntelligenceApi} from '../intelligence/api';
import {workspaceApi} from './api';
import {ViewPersistence} from './ViewPersistence';
import {createFlowchartApi} from '../flowchart/api';
import type {ProjectType, Workspace, WorkspaceSnapshot} from './types';

interface Loaded {workspace: Workspace; snapshot: WorkspaceSnapshot; persistence: ViewPersistence}
interface Manager {
  workspaces: Workspace[]; loaded: Loaded[]; activeId: string; loading: boolean; switching: string;
  error: string; saveErrors: Record<string, string>; creating: boolean; focusRequest: number;
  select: (id: string) => Promise<void>; create: (name: string, projectType?: ProjectType) => Promise<boolean>; retry: () => void;
  rename: (id: string, name: string) => Promise<boolean>; remove: (id: string) => Promise<boolean>;
}
const ManagerContext = createContext<Manager | null>(null);
export const useWorkspaceManager = () => useContext(ManagerContext);
const SELECTED = 'project-intelligence-workspace';
export function WorkspaceManagerProvider({children}: {children: ReactNode}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState('');
  const [error, setError] = useState('');
  const [saveErrors, setSaveErrors] = useState<Record<string,string>>({});
  const [creating, setCreating] = useState(false);
  const [focusRequest,setFocusRequest]=useState(0);
  const cache = useRef(new Map<string, Loaded>());
  const pending = useRef(new Map<string, Promise<Loaded>>());
  const current = useRef('');
  const records = useRef<Workspace[]>([]);
  const sequence = useRef(0);
  const createLock = useRef(false);
  const boot = useRef<Promise<void> | null>(null);
  const reportSave = useCallback((id: string, message: string) => setSaveErrors(old => ({...old,[id]:message})), []);
  const obtain = useCallback((workspace: Workspace) => {
    const existing = cache.current.get(workspace.id);
    if (existing) return Promise.resolve(existing);
    const running = pending.current.get(workspace.id);
    if (running) return running;
    const promise = workspaceApi.snapshot(workspace.id).then(snapshot => {
      if (snapshot.workspace_id !== workspace.id) throw new Error('Workspace response did not match the selected project.');
      const item = {workspace, snapshot, persistence:new ViewPersistence(workspace.id, snapshot.view, reportSave)};
      cache.current.set(workspace.id,item); setLoaded([...cache.current.values()]);
      return item;
    }).finally(() => pending.current.delete(workspace.id));
    pending.current.set(workspace.id,promise); return promise;
  }, [reportSave]);
  const activate = useCallback((id: string) => {
    if(current.current&&current.current!==id)setFocusRequest(value=>value+1);
    current.current = id; setActiveId(id);
    try {sessionStorage.setItem(SELECTED,id);} catch { /* ID preference only; memory remains usable. */ }
  }, []);
  const select = useCallback(async (id: string) => {
    if (id === current.current) {sequence.current++;setSwitching('');return;}
    const record = records.current.find(w => w.id === id);
    if (!record) return;
    const token = ++sequence.current;
    void cache.current.get(current.current)?.persistence.flush();
    setError('');
    if (cache.current.has(id)) {activate(id); setSwitching(''); return;}
    setSwitching(id);
    try {await obtain(record); if (token === sequence.current) activate(id);}
    catch (e) {if (token === sequence.current) setError(e instanceof Error ? e.message : 'The workspace could not be opened. Try again.');}
    finally {if (token === sequence.current) setSwitching('');}
  }, [obtain,activate]);
  const initialise = useCallback(() => {
    if (boot.current) return;
    setLoading(true); setError('');
    boot.current = (async () => {
      try {
        const list = await workspaceApi.list(); records.current = list.workspaces; setWorkspaces(list.workspaces);
        let id = list.default_workspace_id;
        try {const preference=sessionStorage.getItem(SELECTED); if(list.workspaces.some(w=>w.id===preference)) id=preference!;} catch { /* optional preference */ }
        const workspace = list.workspaces.find(w => w.id === id);
        if (!workspace) throw new Error('No accessible workspace was returned. Existing data has not been changed.');
        await obtain(workspace); activate(id);
      } catch (e) {setError(e instanceof Error ? e.message : 'Workspaces could not be loaded.');}
      finally {setLoading(false); boot.current=null;}
    })();
  }, [obtain,activate]);
  useEffect(initialise,[initialise]);
  useEffect(() => {const flush=()=>{for(const item of cache.current.values())void item.persistence.flush();};window.addEventListener('pagehide',flush);return()=>window.removeEventListener('pagehide',flush);},[]);
  async function create(name: string, projectType: ProjectType = 'code') {
    if (createLock.current) return false;
    createLock.current=true;setCreating(true);setError('');
    try {
      const workspace=await workspaceApi.create(name.trim(), projectType);
      records.current=[...records.current,workspace];setWorkspaces(records.current);
      await select(workspace.id);
      return current.current===workspace.id;
    } catch(e) {setError(e instanceof Error?e.message:'The workspace could not be created.');return false;}
    finally {createLock.current=false;setCreating(false);}
  }
  async function rename(id: string, name: string) {
    setError('');
    try {
      const updated=await workspaceApi.rename(id,name.trim());
      records.current=records.current.map(w=>w.id===id?updated:w);setWorkspaces(records.current);
      const item=cache.current.get(id);
      if(item){cache.current.set(id,{...item,workspace:updated});setLoaded([...cache.current.values()]);}
      return true;
    } catch(e) {setError(e instanceof Error?e.message:'The workspace could not be renamed.');return false;}
  }
  async function remove(id: string) {
    setError('');
    if(current.current===id){
      // Move to another project first so the screen never goes blank or saves into a deleted workspace.
      const fallback=records.current.find(w=>w.is_legacy&&w.id!==id)??records.current.find(w=>w.id!==id);
      if(!fallback)return false;
      await select(fallback.id);
      if(current.current!==fallback.id)return false;
    }
    try {await workspaceApi.remove(id);}
    catch(e) {setError(e instanceof Error?e.message:'The workspace could not be deleted.');return false;}
    cache.current.get(id)?.persistence.dispose();
    cache.current.delete(id);pending.current.delete(id);
    records.current=records.current.filter(w=>w.id!==id);setWorkspaces(records.current);setLoaded([...cache.current.values()]);
    setSaveErrors(old=>{const next={...old};delete next[id];return next;});
    try {if(sessionStorage.getItem(SELECTED)===id)sessionStorage.removeItem(SELECTED);} catch { /* optional preference */ }
    return true;
  }
  return <ManagerContext.Provider value={{workspaces,loaded,activeId,loading,switching,error,saveErrors,creating,focusRequest,select,create,rename,remove,retry:initialise}}>{children}</ManagerContext.Provider>;
}

function useBinding(loaded: Loaded, active: boolean) {
  const clients=useMemo(()=>({api:createApi(loaded.workspace.id),intelligenceApi:createIntelligenceApi(loaded.workspace.id),flowchartApi:createFlowchartApi(loaded.workspace.id)}),[loaded.workspace.id]);
  return useMemo(()=>({...loaded,...clients,active}),[loaded,clients,active]);
}
const BindingContext=createContext<ReturnType<typeof useBinding>|null>(null);
export function WorkspaceBinding({loaded,active,children}:{loaded:Loaded;active:boolean;children:ReactNode}) {
  const value=useBinding(loaded,active);
  return <BindingContext.Provider value={value}>{children}</BindingContext.Provider>;
}
export const useWorkspace=()=>useContext(BindingContext);
