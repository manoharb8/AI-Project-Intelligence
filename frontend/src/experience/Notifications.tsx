import {useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {CheckCircle2,Info,TriangleAlert,X} from 'lucide-react';
import {useSession} from '../SessionContext';
import type {ToastMessage} from './useNotifications';
const VISIBLE_MS = 2520;
const EXIT_MS = 180;
export function Toast({item,dismiss,routeKey=''}:{item:ToastMessage;dismiss:(id:number)=>void;routeKey?:string}){
  const element=useRef<HTMLDivElement>(null);
  const dismissRef=useRef(dismiss);
  dismissRef.current=dismiss;
  const [hovered,setHovered]=useState(false);
  const [focused,setFocused]=useState(false);
  const paused=hovered||focused;
  const [closing,setClosing]=useState(false);
  const remaining=useRef(VISIBLE_MS);
  useEffect(()=>{setHovered(false);setFocused(Boolean(element.current?.contains(document.activeElement)));},[routeKey]);
  useEffect(()=>{
    const syncFocus=()=>setFocused(Boolean(element.current?.contains(document.activeElement)));
    const syncPointer=(event:PointerEvent)=>{if(!element.current?.contains(event.target as Node))setHovered(false);};
    const leaveWindow=()=>{setHovered(false);setFocused(false);};
    document.addEventListener('focusin',syncFocus);
    document.addEventListener('pointermove',syncPointer);
    window.addEventListener('blur',leaveWindow);
    return()=>{document.removeEventListener('focusin',syncFocus);document.removeEventListener('pointermove',syncPointer);window.removeEventListener('blur',leaveWindow);};
  },[]);
  useEffect(()=>{
    if(paused||closing)return;
    const started=Date.now();
    const timer=window.setTimeout(()=>setClosing(true),remaining.current);
    return ()=>{window.clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(Date.now()-started));};
  },[paused,closing,item.id]);
  useEffect(()=>{
    if(!closing)return;
    const timer=window.setTimeout(()=>dismissRef.current(item.id),EXIT_MS);
    return ()=>window.clearTimeout(timer);
  },[closing,item.id]);
  const Icon=item.tone==='success'?CheckCircle2:item.tone==='info'?Info:TriangleAlert;
  return <div ref={element} className={`operation-toast toast-${item.tone} ${closing?'toast-exiting':''}`} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocus={()=>setFocused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
    <Icon size={18} aria-hidden="true"/><div><strong>{item.title}</strong><p>{item.detail}</p></div><button className="icon-button" aria-label={`Dismiss ${item.title}`} onClick={()=>setClosing(true)}><X size={16}/></button>
  </div>;
}
export default function Notifications(){
  const {notifications,dismissNotification}=useSession();
  const location=useLocation();
  return <section className="operation-toasts" aria-label="Operation notifications" role="log" aria-live="polite" aria-relevant="additions" aria-atomic="false">{notifications.map(item=><Toast routeKey={location.key} key={item.id} item={item} dismiss={dismissNotification}/>)}</section>;
}
