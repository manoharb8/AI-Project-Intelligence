import type {Evidence} from '../types';

export interface SourceReference {evidence_id: string; quote: string}
export interface DocumentItem {id: string; title: string; references: SourceReference[]}
export interface UserStory extends DocumentItem {role: string | null; need: string; benefit: string | null; acceptance_criteria: string[]; information_state: 'explicit' | 'partial'}
export interface RiskEntry extends DocumentItem {description: string; categories: string[]; impact: string | null; likelihood: string | null; status: string | null; mitigation: string | null; severity: string | null}
export interface ActionItem extends DocumentItem {description: string; owner: string | null; due_date: string | null; status: string | null; dependency: string | null}
export interface ResultMetadata {status: 'ok' | 'partial' | 'insufficient_information'; query: string; generated_at: string; provider: string; evidence: Evidence[]; retrieved_count: number; evidence_limited: boolean; warnings: string[]}
export interface DocumentationResult extends ResultMetadata {user_stories: UserStory[]; risks: RiskEntry[]; action_items: ActionItem[]}
export interface ScopeSignal {category: string; state: 'known' | 'unclear' | 'missing'; points: number; references: SourceReference[]}
export interface HealthDimension {id: 'scope_clarity' | 'timeline_risk' | 'blocker_health'; label: string; state: 'assessed' | 'insufficient_information' | 'conflicting_evidence'; score: number | null; health_contribution: number | null; higher_is_better: boolean; weight: number; count: number | null; explanation: string; calculation: string; references: SourceReference[]; scope_signals: ScopeSignal[]}
export interface HealthResult extends ResultMetadata {overall_score: number | null; interpretation: string; assessed_dimensions: number; dimensions: HealthDimension[]; methodology_version: 'evidence-health-v1'; methodology: string}
export interface ConversationMessage {role: 'user' | 'assistant'; content: string}
export interface AnswerStatement {category: string; reference: SourceReference; owner: string | null; due_date: string | null; source_status: string | null; severity: string | null}
export interface AssistantResult extends ResultMetadata {question: string; resolved_question: string; answer: string; grounding: 'source_quotations' | 'derived_health_assessment' | 'insufficient_evidence'; statements: AnswerStatement[]; health: HealthResult | null; suggested_questions: string[]}
export type DocumentationTab = 'user_stories' | 'risks' | 'action_items';
export interface ChatTurn {id: number; question: string; history: ConversationMessage[]; revision: number; result: AssistantResult | null; error: string; pending: boolean}
