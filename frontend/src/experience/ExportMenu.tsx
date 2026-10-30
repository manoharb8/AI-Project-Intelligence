import {useEffect,useRef,useState} from 'react';
import {Download,FileText,LoaderCircle,ChevronDown} from 'lucide-react';
import {useSession} from '../SessionContext';
import {useWorkspace} from '../workspaces/WorkspaceContext';
import {useIntelligence} from '../intelligence/IntelligenceContext';
import {exportProject,type ExportFormat} from './exportApi';
export default function ExportMenu(){
  const workspace=useWorkspace();
  const {agents,uploading,kb,notify}=useSession();
  const {briefing}=useIntelligence();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState<ExportFormat|null>(null),[error,setError]=useState('');
  const menu=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),first=useRef<HTMLButtonElement>(null);
  const lock=useRef(false),controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const hasResults=Object.values(agents).some(work=>work.result);
  const pending=uploading||kb?.documents.some(d=>d.status==='processing')||Object.values(agents).some(w=>w.busy||w.waiting)||Object.values(briefing).some(w=>w.busy||w.waiting);
  const disabled=Boolean(busy||!hasResults||pending);
  useEffect(()=>{
    if(!open)return;
    first.current?.focus();
    const close=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);
  },[open]);
  async function download(format:ExportFormat){
    if(disabled||lock.current)return;
    lock.current=true;setBusy(format);setError('');setOpen(false);trigger.current?.focus();
    const abort=new AbortController();controller.current=abort;
    try{
      const {blob,filename}=await exportProject(workspace?.workspace.id??'legacy',format,abort.signal);
      if(abort.signal.aborted)return;
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),30000);
      notify('Report download prepared',`${format==='pdf'?'PDF':'Word'} report created from saved results. Check your browser downloads.`,'success');
    }catch(e){if(!abort.signal.aborted){const message=e instanceof Error?e.message:'The report could not be downloaded.';setError(message);notify('Report export failed',message,'error');}}
    finally{if(!abort.signal.aborted){setBusy(null);lock.current=false;}}
  }
  return <div className="export-control" ref={menu} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))setOpen(false);}} onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);trigger.current?.focus();}}}>
    <button ref={trigger} className="button secondary export-trigger" aria-expanded={open} aria-controls="export-options" disabled={disabled} aria-describedby="export-help" onClick={()=>setOpen(!open)}>{busy?<LoaderCircle size={16} className="spin"/>:<Download size={16}/>}<span>{busy?'Preparing download…':'Export / Download'}</span><ChevronDown size={14}/></button>
    <span className="sr-only" id="export-help">{!hasResults?'Available after project analysis.':pending?'Available when current analysis and intelligence requests finish.':'Download saved results; any missing or outdated sections are labeled in the report.'}</span>
    {open&&<div className="export-options" id="export-options" role="group" aria-label="Download format"><p>Export available project information</p><button ref={first} onClick={()=>void download('pdf')}><FileText size={18}/><span>PDF report<small>Ready to review and share</small></span><Download size={15}/></button><button onClick={()=>void download('docx')}><FileText size={18}/><span>Microsoft Word (.docx)<small>Editable project report</small></span><Download size={15}/></button><small>Includes evidence, original scores and missing-information labels.</small></div>}
    {error&&<p className="export-error" role="alert">{error} Open Export / Download to retry.</p>}
  </div>;
}
