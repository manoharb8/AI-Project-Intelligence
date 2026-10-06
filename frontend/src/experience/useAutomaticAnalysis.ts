import {useEffect, useRef, useState} from 'react';
import {AutomaticResource} from '../intelligence/AutomaticResource';
import {useAutomaticWork} from '../intelligence/useAutomaticWork';
import {agentSpecs} from '../agentSpecs';
import type {createApi} from '../api';
import type {WorkspaceSnapshot} from '../workspaces/types';

export function useAutomaticAnalysis(api:ReturnType<typeof createApi>, saved:WorkspaceSnapshot|undefined, revision:number, ready:boolean, sourcesChanging:boolean, active:boolean) {
  const environment=useRef({revision,ready,sourcesChanging});
  environment.current={revision,ready,sourcesChanging};
  const [resources]=useState(()=>{
    const entries={
      scope:new AutomaticResource((query:string)=>api.analyze('scope',query),()=>environment.current),
      risk:new AutomaticResource((query:string)=>api.analyze('risk',query),()=>environment.current),
      blockers:new AutomaticResource((query:string)=>api.analyze('blockers',query),()=>environment.current),
    };
    for(const entry of saved?.results??[]) if(entry.kind==='scope'||entry.kind==='risk'||entry.kind==='blockers')entries[entry.kind].restore(entry.query,entry.result,entry.source_version===saved?.source_version?0:-1);
    return entries;
  });
  const version=useRef({revision,sourcesChanging});
  useEffect(()=>{
    if(version.current.revision!==revision||(sourcesChanging&&!version.current.sourcesChanging))Object.values(resources).forEach(r=>r.invalidate());
    version.current={revision,sourcesChanging};
  },[revision,sourcesChanging,resources]);
  const restored=(kind:'scope'|'risk'|'blockers')=>{
    const last=saved?.results.filter(entry=>entry.kind===kind).at(-1);
    return saved?{query:saved.view[`${kind}_query`]||agentSpecs[kind].query,focus:last?.query??agentSpecs[kind].query}:undefined;
  };
  const scope=useAutomaticWork(resources.scope,agentSpecs.scope.query,active,ready,revision,restored('scope'));
  const risk=useAutomaticWork(resources.risk,agentSpecs.risk.query,active,ready,revision,restored('risk'));
  const blockers=useAutomaticWork(resources.blockers,agentSpecs.blockers.query,active,ready,revision,restored('blockers'));
  const current=<T extends {result:unknown;stale:boolean}>(work:T)=>({...work,stale:work.stale||Boolean(work.result&&sourcesChanging)});
  return {scope:current(scope),risk:current(risk),blockers:current(blockers)};
}
