import type {KnowledgeBase,ProjectDocument,QueryResult,AgentKind,AgentResult,AgentAvailability} from './types';
export async function request<T>(path:string, options?:RequestInit, workspaceId?:string):Promise<T> {
  const headers=new Headers(options?.headers);
  if(workspaceId) headers.set('X-Workspace-ID',workspaceId);
  const response=await fetch(`/api${path}`,{...options,headers});
  if(!response.ok){let message='The request failed. Check that the backend is running and try again.';try{const body=await response.json();if(typeof body.detail==='string')message=body.detail;}catch{}throw new Error(message);}
  return response.json();
}
export const createApi=(workspaceId?:string)=>({
  agentStatus:()=>request<AgentAvailability>('/agents/status',undefined,workspaceId),
  analyze:(kind:AgentKind,query:string)=>request<AgentResult>(`/agents/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query})},workspaceId),
  summary:()=>request<KnowledgeBase>('/knowledge-base',undefined,workspaceId),
  upload:(files:File[])=>{const form=new FormData();files.forEach(file=>form.append('files',file));return request<{documents:ProjectDocument[]}>('/documents/upload',{method:'POST',body:form},workspaceId);},
  query:(query:string)=>request<QueryResult>('/retrieval/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,top_k:5})},workspaceId)
});
export const api=createApi();
