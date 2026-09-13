"""The provider selects exact source statements; the server owns derived fields."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from app.api.schemas import Evidence, Query

AgentKind = Literal['scope', 'risk', 'blockers']
Category = Literal['goals', 'milestones', 'timelines', 'responsibilities', 'deliverables',
                   'schedule_risks', 'dependency_gaps', 'delivery_challenges', 'delivery_forecast',
                   'pending_decisions', 'unresolved_issues', 'action_items']
CATEGORIES = {
    'scope': ('goals', 'milestones', 'timelines', 'responsibilities', 'deliverables'),
    'risk': ('schedule_risks', 'dependency_gaps', 'delivery_challenges', 'delivery_forecast'),
    'blockers': ('pending_decisions', 'unresolved_issues', 'action_items'),
}

class AnalysisRequest(Query):
    model_config = ConfigDict(extra='forbid')
    query: str = Field(default='Review the uploaded project documents.', min_length=2, max_length=500)
    # Retrieval bounds are fixed server-side for agent runs.
    top_k: Literal[5] = 5

class Candidate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    category: Category
    evidence_id: str = Field(min_length=1, max_length=200)
    quote: str = Field(min_length=3, max_length=2500)

class AgentPayload(BaseModel):
    model_config = ConfigDict(extra='forbid')
    findings: list[Candidate] = Field(max_length=60)

class Finding(Candidate):
    information_state: Literal['known', 'unclear']
    owner: str | None = None
    due_date: str | None = None
    dates: list[str] = Field(default_factory=list)
    source_status: str | None = None
    severity: str | None = None
    confidence: Literal['explicit_source_statement'] = 'explicit_source_statement'

class Coverage(BaseModel):
    category: Category
    state: Literal['known', 'unclear', 'missing']
    count: int

class AnalysisResult(BaseModel):
    agent: AgentKind
    status: Literal['ok', 'partial', 'insufficient_information']
    message: str
    query: str
    provider: str
    generated_at: str
    findings: list[Finding]
    evidence: list[Evidence]
    coverage: list[Coverage]
    retrieved_count: int
    evidence_limited: bool
    warnings: list[str]

class AgentAvailability(BaseModel):
    provider: str
    mode: Literal['extractive', 'llm', 'unavailable']
    ready: bool
    message: str
    agents: list[str]
