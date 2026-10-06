import {useEffect,useState} from 'react';
import {CheckCircle2,Info,TriangleAlert,X} from 'lucide-react';
import {useSession} from '../SessionContext';
import type {ToastMessage} from './useNotifications';
function Toast({item,dismiss}:{item:ToastMessage;dismiss:(id:number)=>void}){
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    if(paused||item.tone==='error'||item.tone==='warning')return;
    const timer=window.setTimeout(()=>dismiss(item.id),8000);
    return ()=>window.clearTimeout(timer);
  },[paused,item,dismiss]);
  const Icon=item.tone==='success'?CheckCircle2:item.tone==='info'?Info:TriangleAlert;
  return <div className={`operation-toast toast-${item.tone}`} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setPaused(false);}}>
    <Icon size={19} aria-hidden="true"/><div><strong>{item.title}</strong><p>{item.detail}</p></div><button className="icon-button" aria-label={`Dismiss ${item.title}`} onClick={()=>dismiss(item.id)}><X size={16}/></button>
  </div>;
}
export default function Notifications(){
  const {notifications,dismissNotification}=useSession();
  return <section className="operation-toasts" aria-label="Operation notifications" role="log" aria-live="polite" aria-relevant="additions" aria-atomic="false">{notifications.map(item=><Toast key={item.id} item={item} dismiss={dismissNotification}/>)}</section>;
}
