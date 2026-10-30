import {request} from '../api';
import type {FlowchartAnalysis, FlowchartStatus, FlowchartSummary, FlowchartUploadResult} from './types';

export const createFlowchartApi = (workspaceId?: string) => ({
  status: () => request<FlowchartStatus>('/flowcharts/status', undefined, workspaceId),
  list: () => request<FlowchartSummary[]>('/flowcharts', undefined, workspaceId),
  get: (id: string) => request<FlowchartAnalysis>(`/flowcharts/${encodeURIComponent(id)}`, undefined, workspaceId),
  analyze: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<FlowchartUploadResult>('/flowcharts/analyze', {method: 'POST', body: form}, workspaceId);
  },
  remove: (id: string) => request<{id: string; deleted: boolean}>(`/flowcharts/${encodeURIComponent(id)}`, {method: 'DELETE'}, workspaceId),
});
export const flowchartApi = createFlowchartApi();
