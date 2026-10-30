import {request} from '../api';
import type {AssistantResult, ConversationMessage, DocumentationResult, HealthResult} from './types';

function post<T>(path: string, body: object, signal?: AbortSignal, workspaceId?: string) {
  return request<T>(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal}, workspaceId);
}
export const createIntelligenceApi = (workspaceId?: string) => ({
  documentation: (query: string) => post<DocumentationResult>('/documentation/generate', {query}, undefined, workspaceId),
  health: (query: string) => post<HealthResult>('/project-health/assess', {query}, undefined, workspaceId),
  assistant: (question: string, history: ConversationMessage[], signal?: AbortSignal) => post<AssistantResult>('/assistant/query', {question, history}, signal, workspaceId),
});
export const intelligenceApi = createIntelligenceApi();
