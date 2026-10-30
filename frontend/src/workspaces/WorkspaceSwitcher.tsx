import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {ArrowLeft,Check,ChevronDown,Folder,FolderPlus,LoaderCircle,Pencil,Plus,Search,ShieldCheck,Trash2,X} from 'lucide-react';
import IntelligenceMark from '../presentation/IntelligenceMark';
import {useWorkspaceManager} from './WorkspaceContext';
import {PROJECT_TYPE_LABEL,projectTypeOf,type ProjectType,type Workspace} from './types';
const TYPE_HELP:Record<ProjectType,string>={code:'Software, systems and data flows',uiux:'Screens, user flows and journeys'};
type Action={kind:'rename'|'delete';workspace:Workspace}|null;
export default function WorkspaceSwitcher(){
  const manager=useWorkspaceManager();
  const [open,setOpen]=useState(false),[exiting,setExiting]=useState(false),[creating,setCreating]=useState(false),[search,setSearch]=useState(''),[name,setName]=useState('');
  const [projectType,setProjectType]=useState<ProjectType>('code'),[action,setAction]=useState<Action>(null),[renameValue,setRenameValue]=useState(''),[working,setWorking]=useState(false);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),nameInput=useRef<HTMLInputElement>(null),renameInput=useRef<HTMLInputElement>(null),cancelDelete=useRef<HTMLButtonElement>(null);
  const closeTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>{if(manager?.focusRequest)trigger.current?.focus();},[manager?.focusRequest]);
  useEffect(()=>()=>clearTimeout(closeTimer.current),[]);
  function show(){clearTimeout(closeTimer.current);setExiting(false);setOpen(true);}
  function close(restore=false){
    if(!open)return;
    setOpen(false);setExiting(true);clearTimeout(closeTimer.current);
    closeTimer.current=setTimeout(()=>{setExiting(false);setCreating(false);setAction(null);setSearch('');},120);
    if(restore)trigger.current?.focus();
  }
  useEffect(()=>{
    if(!open)return;
    if(creating)nameInput.current?.focus();
    else if(action?.kind==='rename')renameInput.current?.focus();
    else if(action?.kind==='delete')cancelDelete.current?.focus();
    else (panel.current?.querySelector<HTMLElement>('input')??panel.current?.querySelector<HTMLElement>('[aria-current="true"]')??panel.current?.querySelector<HTMLElement>('.workspace-option'))?.focus();
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};
    document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
  },[open,creating,action]);
  if(!manager)return null;
  const active=manager.workspaces.find(w=>w.id===manager.activeId);
  const visible=manager.workspaces.filter(w=>w.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const initials=(text:string)=>text.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const heading=creating?'New workspace':action?.kind==='rename'?'Rename workspace':action?.kind==='delete'?'Delete workspace':'Switch workspace';
  const label=creating?'Create a new workspace':action?.kind==='rename'?'Rename workspace':action?.kind==='delete'?'Delete workspace':'Project workspaces';
  function keys(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(action&&!working){setAction(null);return;}close(true);return;}
    if(creating||action||!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const items=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('.workspace-option')??[]);
    if(!items.length)return;
    event.preventDefault();const index=items.indexOf(document.activeElement as HTMLButtonElement);
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:(index-1+items.length)%items.length;
    items[next].focus();
  }
  return <div className="project-switcher" ref={root} onBlur={e=>{if(e.relatedTarget&&!root.current?.contains(e.relatedTarget as Node))close();}}>
    <button ref={trigger} className="project-switcher-trigger" aria-label={`Switch workspace: ${active?.name??'Projects'}`} aria-haspopup="dialog" aria-expanded={open} aria-controls="project-switcher-panel" onClick={()=>open?close():show()} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();show();}}}>
      <span className="workspace-avatar" aria-hidden="true"><IntelligenceMark/></span><span className="workspace-trigger-copy"><small>PROJECT WORKSPACE{active?` · ${PROJECT_TYPE_LABEL[projectTypeOf(active)].toUpperCase()}`:''}</small><strong>{active?.name??'Projects'}</strong></span><ChevronDown className={open?'switcher-chevron open':'switcher-chevron'} size={16}/>
    </button>
    {(open||exiting)&&<div id="project-switcher-panel" ref={panel} role="dialog" aria-label={label} aria-hidden={!open||undefined} inert={!open} className={`project-switcher-panel ${exiting?'exiting':''}`} onKeyDown={keys}>
      <div className="workspace-popover-heading"><div><small>YOUR PROJECTS</small><h2>{heading}</h2></div><button className="icon-button" aria-label="Close workspace switcher" onClick={()=>close(true)}><X size={18}/></button></div>
      {creating?<form onSubmit={async e=>{e.preventDefault();if(name.trim()&&!manager.creating&&await manager.create(name,projectType)) {setName('');setProjectType('code');close(true);}}}>
        <div className="workspace-create-symbol"><FolderPlus size={26}/></div><p className="workspace-create-description">A fresh knowledge base for a new project. Your existing workspaces stay exactly where they are.</p>
        <fieldset className="workspace-type" disabled={manager.creating}><legend>Project type</legend>{(['code','uiux'] as ProjectType[]).map(type=><label key={type} className={`workspace-type-option ${projectType===type?'selected':''}`}><input type="radio" name="workspace-type" value={type} checked={projectType===type} onChange={()=>setProjectType(type)}/><span><strong>{PROJECT_TYPE_LABEL[type]}</strong><small>{TYPE_HELP[type]}</small></span></label>)}</fieldset>
        <label htmlFor="workspace-name">Project name</label><input id="workspace-name" ref={nameInput} value={name} maxLength={80} placeholder="Name your project" autoComplete="off" disabled={manager.creating} onChange={e=>setName(e.target.value)}/>
        <p className="workspace-isolation-note"><ShieldCheck size={15}/>Separate documents, evidence and intelligence.</p>
        {manager.error&&<p role="alert" className="workspace-inline-error">{manager.error}</p>}
        <div className="workspace-create-actions"><button type="button" className="button secondary" disabled={manager.creating} onClick={()=>setCreating(false)}><ArrowLeft size={15}/>Back</button><button className="button" disabled={!name.trim()||manager.creating}>{manager.creating?<LoaderCircle size={16} className="spin"/>:<Plus size={16}/>} {manager.creating?'Creating…':'Create workspace'}</button></div>
      </form>:action?.kind==='rename'?<form onSubmit={async e=>{e.preventDefault();if(!renameValue.trim()||working)return;setWorking(true);const ok=await manager.rename(action.workspace.id,renameValue);setWorking(false);if(ok){setAction(null);trigger.current?.focus();}}}>
        <div className="workspace-create-symbol"><Pencil size={24}/></div><p className="workspace-create-description">Only the name changes. Documents, analyses and saved results stay as they are.</p>
        <label htmlFor="workspace-rename">Workspace name</label><input id="workspace-rename" ref={renameInput} value={renameValue} maxLength={80} autoComplete="off" disabled={working} onChange={e=>setRenameValue(e.target.value)}/>
        {manager.error&&<p role="alert" className="workspace-inline-error">{manager.error}</p>}
        <div className="workspace-create-actions"><button type="button" className="button secondary" disabled={working} onClick={()=>setAction(null)}><ArrowLeft size={15}/>Back</button><button className="button" disabled={!renameValue.trim()||renameValue.trim()===action.workspace.name||working}>{working?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>} {working?'Saving…':'Save name'}</button></div>
      </form>:action?.kind==='delete'?<div className="workspace-delete" role="group" aria-label="Confirm workspace deletion">
        <div className="workspace-create-symbol danger"><Trash2 size={24}/></div>
        <p className="workspace-delete-title">Delete “{action.workspace.name}”?</p>
        <p className="workspace-create-description">This permanently removes its uploaded documents, search index, saved analyses and flowchart analyses. This cannot be undone. Other workspaces are not affected.</p>
        {manager.error&&<p role="alert" className="workspace-inline-error">{manager.error}</p>}
        <div className="workspace-create-actions"><button ref={cancelDelete} type="button" className="button secondary" disabled={working} onClick={()=>setAction(null)}><ArrowLeft size={15}/>Cancel</button><button type="button" className="button danger" disabled={working} onClick={async()=>{setWorking(true);const ok=await manager.remove(action.workspace.id);setWorking(false);if(ok){setAction(null);close(true);}}}>{working?<LoaderCircle size={16} className="spin"/>:<Trash2 size={16}/>} {working?'Deleting…':'Delete permanently'}</button></div>
      </div>:<>
        {manager.workspaces.length>=6&&<div className="workspace-search"><Search size={16}/><label className="sr-only" htmlFor="workspace-search">Search projects</label><input id="workspace-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects…" autoComplete="off"/></div>}
        <div className="workspace-options" aria-label="Available projects">{visible.map(w=><div key={w.id} className="workspace-row"><button type="button" className={`workspace-option ${w.id===manager.activeId?'selected':''}`} aria-current={w.id===manager.activeId?'true':undefined} onClick={async()=>{await manager.select(w.id);close(true);}}><span className="workspace-avatar" aria-hidden="true">{initials(w.name)}</span><span><strong>{w.name}</strong><small>{PROJECT_TYPE_LABEL[projectTypeOf(w)]} · {w.is_legacy?'Original knowledge base':'Isolated project workspace'}</small></span>{manager.switching===w.id?<LoaderCircle className="spin" size={17}/>:w.id===manager.activeId?<Check size={18}/>:<Folder size={16}/>}</button>
          <span className="workspace-row-actions"><button type="button" className="icon-button" aria-label={`Rename ${w.name}`} title="Rename" onClick={()=>{setRenameValue(w.name);setAction({kind:'rename',workspace:w});}}><Pencil size={15}/></button>
          <button type="button" className="icon-button" aria-label={`Delete ${w.name}`} title={w.is_legacy?'The original project cannot be deleted':'Delete'} disabled={w.is_legacy} onClick={()=>setAction({kind:'delete',workspace:w})}><Trash2 size={15}/></button></span></div>)}{!visible.length&&<p className="workspace-no-match">No projects match “{search}”.</p>}</div>
        <div className="workspace-popover-footer"><button className="workspace-new" onClick={()=>{setCreating(true);setName('');setProjectType('code');}}><span><Plus size={18}/></span><strong>New workspace</strong><small>Start fresh</small></button><p><ShieldCheck size={13}/>Project data stays separate.</p></div>
      </>}
    </div>}
  </div>;
}
