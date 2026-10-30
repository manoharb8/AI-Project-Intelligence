"""Public contracts for flowchart analysis.

The model is only a reader. Everything the UI shows has passed server-side
validation: dangling references are removed and an inferred risk can never be
presented as a confirmed one.
"""
from typing import Literal
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

Priority = Literal['Critical', 'High', 'Medium', 'Low']
# observed: shown by the diagram itself, with node/edge references that exist.
# inferred: depends on assumptions about the real process; never above Medium.
Basis = Literal['observed', 'inferred']
NodeType = Literal['start', 'end', 'process', 'decision', 'input_output', 'subprocess', 'connector', 'other']
RiskCategory = Literal['failure_point', 'missing_step', 'bottleneck', 'logic_gap', 'dead_end', 'ambiguity', 'other']
Legibility = Literal['good', 'partial', 'poor']
SourceType = Literal['png', 'jpeg', 'webp', 'pdf']
ProjectType = Literal['code', 'uiux']

PRIORITY_ORDER = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}


class FlowNode(BaseModel):
    id: str
    label: str
    type: NodeType = 'process'
    legible: bool = True


class FlowEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    source: str = Field(validation_alias=AliasChoices('source', 'from'))
    target: str = Field(validation_alias=AliasChoices('target', 'to'))
    label: str = ''


class Risk(BaseModel):
    id: str
    title: str
    description: str
    category: RiskCategory = 'other'
    priority: Priority
    basis: Basis
    origin: Literal['vision_model', 'structural_check']
    evidence_nodes: list[str] = Field(default_factory=list)
    evidence_edges: list[FlowEdge] = Field(default_factory=list)
    priority_reason: str
    mitigation: str
    assumption: str | None = None
    priority_note: str | None = None


class RiskSummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    observed: int = 0
    inferred: int = 0


class FlowchartSummary(BaseModel):
    id: str
    filename: str
    source_type: SourceType
    page: int | None = None
    created_at: str
    title: str | None = None
    node_count: int
    risk_summary: RiskSummary


class FlowchartAnalysis(FlowchartSummary):
    page_count: int | None = None
    provider: str
    model: str
    project_type: ProjectType = 'code'
    purpose: str
    legibility: Legibility = 'good'
    image_issues: list[str] = Field(default_factory=list)
    nodes: list[FlowNode]
    edges: list[FlowEdge]
    risks: list[Risk]
    uncertainties: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    processing_notes: list[str] = Field(default_factory=list)
    image_media_type: str | None = None
    image_data_url: str | None = None


class SkippedPage(BaseModel):
    page: int
    reason: str


class FlowchartUploadResult(BaseModel):
    analyses: list[FlowchartAnalysis]
    skipped: list[SkippedPage] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class VisionAvailability(BaseModel):
    provider: str
    mode: Literal['groq', 'unavailable']
    model: str | None = None
    ready: bool
    message: str
    accepted_formats: list[str]
    max_file_mb: int
    pdf_max_pages: int


class FlowchartDeleted(BaseModel):
    id: str
    deleted: bool = True
