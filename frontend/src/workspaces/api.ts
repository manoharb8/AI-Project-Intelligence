import {request} from '../api';
import type {ProjectType, Workspace, WorkspaceSnapshot, WorkspaceView} from './types';
export const workspaceApi = {
  list: () => request<{default_workspace_id: string; workspaces: Workspace[]}>('/workspaces'),
  create: (name: string, projectType: ProjectType = 'code') => request<Workspace>('/workspaces', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name, project_type: projectType})}),
  rename: (id: string, name: string) => request<Workspace>(`/workspaces/${encodeURIComponent(id)}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name})}),
  remove: (id: string) => request<{id: string; deleted: boolean; cleanup_pending: boolean}>(`/workspaces/${encodeURIComponent(id)}`, {method:'DELETE'}),
  snapshot: (id: string) => request<WorkspaceSnapshot>(`/workspaces/${encodeURIComponent(id)}/state`, undefined, id),
  saveView: (id: string, view: WorkspaceView) => {
    const body=JSON.stringify(view);
    return request<WorkspaceView>(`/workspaces/${encodeURIComponent(id)}/view`, {method:'PUT', headers:{'Content-Type':'application/json'}, body, keepalive:new TextEncoder().encode(body).length<60000}, id);
  },
};
