export interface ProjectDocument {id:string;filename:string;document_type:string;size_bytes:number;uploaded_at:string;status:'processing'|'indexed'|'error';chunk_count:number;indexed:boolean;error:string|null}
export interface KnowledgeBase {document_count:number;indexed_documents:number;chunk_count:number;supported_formats:string[];retrieval_ready:boolean;documents:ProjectDocument[]}
export interface Evidence {id:string;document_id:string;filename:string;document_type:string;chunk_number:number;location:string;text:string;similarity:number}
export interface QueryResult {status:'ok'|'insufficient_information';message:string;query:string;results:Evidence[]}
export type AgentKind='scope'|'risk'|'blockers';
export interface AgentAvailability {provider:string;mode:'extractive'|'llm'|'unavailable';ready:boolean;message:string;agents:string[]}
export interface AgentFinding {category:string;evidence_id:string;quote:string;information_state:'known'|'unclear';owner:string|null;due_date:string|null;dates:string[];source_status:string|null;severity:string|null;confidence:'explicit_source_statement'}
export interface AgentResult {agent:AgentKind;status:'ok'|'partial'|'insufficient_information';message:string;query:string;provider:string;generated_at:string;findings:AgentFinding[];evidence:Evidence[];coverage:{category:string;state:'known'|'unclear'|'missing';count:number}[];retrieved_count:number;evidence_limited:boolean;warnings:string[]}
