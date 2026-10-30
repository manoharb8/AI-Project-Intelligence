export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Basis = 'observed' | 'inferred';
export interface FlowNode {id: string; label: string; type: string; legible: boolean}
export interface FlowEdge {source: string; target: string; label: string}
export interface FlowRisk {
  id: string; title: string; description: string; category: string; priority: Priority; basis: Basis;
  origin: 'vision_model' | 'structural_check'; evidence_nodes: string[]; evidence_edges: FlowEdge[];
  priority_reason: string; mitigation: string; assumption: string | null; priority_note: string | null;
}
export interface RiskSummary {critical: number; high: number; medium: number; low: number; observed: number; inferred: number}
export interface FlowchartSummary {
  id: string; filename: string; source_type: 'png' | 'jpeg' | 'webp' | 'pdf'; page: number | null; created_at: string;
  title: string | null; node_count: number; risk_summary: RiskSummary;
}
export interface FlowchartAnalysis extends FlowchartSummary {
  page_count: number | null; provider: string; model: string; project_type: 'code' | 'uiux'; purpose: string;
  legibility: 'good' | 'partial' | 'poor'; image_issues: string[]; nodes: FlowNode[]; edges: FlowEdge[]; risks: FlowRisk[];
  uncertainties: string[]; warnings: string[]; processing_notes: string[]; image_media_type: string | null; image_data_url: string | null;
}
export interface FlowchartUploadResult {analyses: FlowchartAnalysis[]; skipped: {page: number; reason: string}[]; notes: string[]}
export interface FlowchartStatus {
  provider: string; mode: 'groq' | 'unavailable'; model: string | null; ready: boolean; message: string;
  accepted_formats: string[]; max_file_mb: number; pdf_max_pages: number;
}
