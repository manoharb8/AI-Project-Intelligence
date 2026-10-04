import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {ArrowLeft,Check,ChevronDown,Folder,FolderPlus,Layers3,LoaderCircle,Plus,Search,ShieldCheck,X} from 'lucide-react';
import {useWorkspaceManager} from './WorkspaceContext';
export default function WorkspaceSwitcher(){
  const manager=useWorkspaceManager();
  const [open,setOpen]=useState(false),[exiting,setExiting]=useState(false),[creating,setCreating]=useState(false),[search,setSearch]=useState(''),[name,setName]=useState('');
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),nameInput=useRef<HTMLInputElement>(null);
  const closeTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>{if(manager?.focusRequest)trigger.current?.focus();},[manager?.focusRequest]);
  useEffect(()=>()=>clearTimeout(closeTimer.current),[]);
  function show(){clearTimeout(closeTimer.current);setExiting(false);setOpen(true);}
  function close(restore=false){
    if(!open)return;
    setOpen(false);setExiting(true);clearTimeout(closeTimer.current);
    closeTimer.current=setTimeout(()=>{setExiting(false);setCreating(false);setSearch('');},120);
    if(restore)trigger.current?.focus();
  }
  useEffect(()=>{
    if(!open)return;
    if(creating)nameInput.current?.focus();
    else (panel.current?.querySelector<HTMLElement>('input')??panel.current?.querySelector<HTMLElement>('[aria-current="true"]')??panel.current?.querySelector<HTMLElement>('.workspace-option'))?.focus();
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};
    document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
  },[open,creating]);
  if(!manager)return null;
  const active=manager.workspaces.find(w=>w.id===manager.activeId);
  const visible=manager.workspaces.filter(w=>w.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const initials=(text:string)=>text.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  function keys(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
    if(creating||!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const items=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('.workspace-option')??[]);
    if(!items.length)return;
    event.preventDefault();const index=items.indexOf(document.activeElement as HTMLButtonElement);
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:(index-1+items.length)%items.length;
    items[next].focus();
  }
  return <div className="project-switcher" ref={root} onBlur={e=>{if(e.relatedTarget&&!root.current?.contains(e.relatedTarget as Node))close();}}>
    <button ref={trigger} className="project-switcher-trigger" aria-label={`Switch workspace: ${active?.name??'Projects'}`} aria-haspopup="dialog" aria-expanded={open} aria-controls="project-switcher-panel" onClick={()=>open?close():show()} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();show();}}}>
      <span className="workspace-avatar" aria-hidden="true"><Layers3 size={19}/></span><span className="workspace-trigger-copy"><small>PROJECT WORKSPACE</small><strong>{active?.name??'Projects'}</strong></span><ChevronDown className={open?'switcher-chevron open':'switcher-chevron'} size={16}/>
    </button>
    {(open||exiting)&&<div id="project-switcher-panel" ref={panel} role="dialog" aria-label={creating?'Create a new workspace':'Project workspaces'} aria-hidden={!open||undefined} inert={!open} className={`project-switcher-panel ${exiting?'exiting':''}`} onKeyDown={keys}>
      <div className="workspace-popover-heading"><div><small>YOUR PROJECTS</small><h2>{creating?'New workspace':'Switch workspace'}</h2></div><button className="icon-button" aria-label="Close workspace switcher" onClick={()=>close(true)}><X size={18}/></button></div>
      {creating?<form onSubmit={async e=>{e.preventDefault();if(name.trim()&&!manager.creating&&await manager.create(name)) {setName('');close(true);}}}>
        <div className="workspace-create-symbol"><FolderPlus size={26}/></div><p className="workspace-create-description">A fresh knowledge base for a new project. Your existing workspaces stay exactly where they are.</p>
        <label htmlFor="workspace-name">Project name</label><input id="workspace-name" ref={nameInput} value={name} maxLength={80} placeholder="Name your project" autoComplete="off" disabled={manager.creating} onChange={e=>setName(e.target.value)}/>
        <p className="workspace-isolation-note"><ShieldCheck size={15}/>Separate documents, evidence and intelligence.</p>
        {manager.error&&<p role="alert" className="workspace-inline-error">{manager.error}</p>}
        <div className="workspace-create-actions"><button type="button" className="button secondary" disabled={manager.creating} onClick={()=>setCreating(false)}><ArrowLeft size={15}/>Back</button><button className="button" disabled={!name.trim()||manager.creating}>{manager.creating?<LoaderCircle size={16} className="spin"/>:<Plus size={16}/>} {manager.creating?'Creating…':'Create workspace'}</button></div>
      </form>:<>
        {manager.workspaces.length>=6&&<div className="workspace-search"><Search size={16}/><label className="sr-only" htmlFor="workspace-search">Search projects</label><input id="workspace-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects…" autoComplete="off"/></div>}
        <div className="workspace-options" aria-label="Available projects">{visible.map(w=><button key={w.id} type="button" className={`workspace-option ${w.id===manager.activeId?'selected':''}`} aria-current={w.id===manager.activeId?'true':undefined} onClick={async()=>{await manager.select(w.id);close(true);}}><span className="workspace-avatar" aria-hidden="true">{initials(w.name)}</span><span><strong>{w.name}</strong><small>{w.is_legacy?'Original knowledge base':'Isolated project workspace'}</small></span>{manager.switching===w.id?<LoaderCircle className="spin" size={17}/>:w.id===manager.activeId?<Check size={18}/>:<Folder size={16}/>}</button>)}{!visible.length&&<p className="workspace-no-match">No projects match “{search}”.</p>}</div>
        <div className="workspace-popover-footer"><button className="workspace-new" onClick={()=>{setCreating(true);setName('');}}><span><Plus size={18}/></span><strong>New workspace</strong><small>Start fresh</small></button><p><ShieldCheck size={13}/>Project data stays separate.</p></div>
      </>}
    </div>}
  </div>;
}
