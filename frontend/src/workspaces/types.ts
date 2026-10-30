import type {AgentResult, QueryResult} from '../types';
import type {AssistantResult, ConversationMessage, DocumentationResult, DocumentationTab, HealthResult} from '../intelligence/types';
export type ProjectType = 'code' | 'uiux';
export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {code: 'Code', uiux: 'UI/UX'};
// project_type is absent on workspaces created before types existed; those are Code projects.
export interface Workspace {id: string; name: string; created_at: string; is_legacy: boolean; project_type?: ProjectType}
export const projectTypeOf = (workspace?: Pick<Workspace, 'project_type'>): ProjectType => workspace?.project_type ?? 'code';
interface SavedBase {key: string; query: string; source_version: string; saved_at: string}
export type SavedResult = SavedBase & (
  {kind: 'retrieval'; result: QueryResult} |
  {kind: 'scope' | 'risk' | 'blockers'; result: AgentResult} |
  {kind: 'documentation'; result: DocumentationResult} |
  {kind: 'health'; result: HealthResult} |
  {kind: 'assistant'; result: AssistantResult; history: ConversationMessage[]}
);
export interface SavedTurn {id: number; question: string; result_key: string | null; error: string}
export interface WorkspaceView {
  retrieval_query: string; scope_query: string; risk_query: string; blockers_query: string;
  documentation_query: string; documentation_focus: string; health_query: string; health_focus: string;
  doc_tab: DocumentationTab; doc_filter: string; action_filter: string; assistant_draft: string; turns: SavedTurn[];
}
export interface WorkspaceSnapshot {workspace_id: string; source_version: string; indexed_sources: Record<string, number>; results: SavedResult[]; view: WorkspaceView}
export function resultKey(kind: string, query: string, history: ConversationMessage[] = []) {
  return JSON.stringify([kind, query.trim(), history.map(m => [m.role, m.content])]);
}
