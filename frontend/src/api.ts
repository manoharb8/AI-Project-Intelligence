import type {KnowledgeBase,ProjectDocument,QueryResult,AgentKind,AgentResult,AgentAvailability} from './types';
async function request<T>(path:string, options?:RequestInit):Promise<T> {
  const response=await fetch(`/api${path}`,options);
  if(!response.ok){let message='The request failed. Check that the backend is running and try again.';try{const body=await response.json();if(typeof body.detail==='string')message=body.detail;}catch{}throw new Error(message);}
  return response.json();
}
export const api={
  agentStatus:()=>request<AgentAvailability>('/agents/status'),
  analyze:(kind:AgentKind,query:string)=>request<AgentResult>(`/agents/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query})}),
  summary:()=>request<KnowledgeBase>('/knowledge-base'),
  upload:(files:File[])=>{const form=new FormData();files.forEach(file=>form.append('files',file));return request<{documents:ProjectDocument[]}>('/documents/upload',{method:'POST',body:form});},
  query:(query:string)=>request<QueryResult>('/retrieval/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,top_k:5})})
};
