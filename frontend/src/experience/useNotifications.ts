import {useCallback, useEffect, useRef, useState} from 'react';
export type ToastTone = 'success' | 'info' | 'warning' | 'error';
export interface ToastMessage {id:number; title:string; detail:string; tone:ToastTone; group?:string}
export function useNotifications() {
  const [notifications,setNotifications]=useState<ToastMessage[]>([]);
  const serial=useRef(0);
  const notify=useCallback((title:string, detail='', tone:ToastTone='info', group?:string)=>{
    const item={id:++serial.current,title,detail,tone,group};
    setNotifications(items=>[...items.filter(previous=>!group||previous.group!==group).slice(-3),item]);
  },[]);
  const dismissNotification=useCallback((id:number)=>setNotifications(items=>items.filter(item=>item.id!==id)),[]);
  return {notifications,notify,dismissNotification};
}
interface Work {busy:boolean; waiting:boolean; error:string; result:{status:string}|null; resultRevision:number; attemptedRevision:number|null}
/** Only transitions caused by actual requests announce events; cache hydration is silent. */
export function useOperationNotice(works:Work[], revision:number, notify:ReturnType<typeof useNotifications>['notify'], kind:'analysis'|'intelligence') {
  const cycle=useRef({revision,running:false});
  const busy=works.some(w=>w.busy), settled=works.every(w=>!w.busy&&!w.waiting&&w.attemptedRevision===revision);
  const failed=works.some(w=>w.error), incomplete=works.some(w=>w.result?.status!=='ok');
  useEffect(()=>{
    if(cycle.current.revision!==revision) cycle.current={revision,running:false};
    if(busy&&!cycle.current.running){cycle.current.running=true;if(kind==='analysis')notify('Project analysis started','Reviewing scope, risks and blockers against your indexed sources.','info',kind);}
    if(cycle.current.running&&settled){
      cycle.current.running=false;
      if(failed)notify(kind==='analysis'?'Analysis needs attention':'Intelligence refresh failed','Previous results are retained. Use Retry to complete the failed request.','error',kind);
      else notify(kind==='analysis'?'Analysis completed successfully':'Project intelligence updated',incomplete?'Some details are not established. Review evidence and missing-information labels.':'Current results are ready to review.',incomplete?'warning':'success',kind);
    }
  },[busy,settled,failed,incomplete,revision,notify,kind]);
}
