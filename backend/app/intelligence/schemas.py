"""Strict, additive API contracts for evidence-derived project intelligence."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.api.schemas import Evidence


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class IntelligenceRequest(StrictModel):
    query: str = Field(default='Review the uploaded project documents.', min_length=2, max_length=500)

    @field_validator('query')
    @classmethod
    def trim_query(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Enter at least two non-space characters.')
        return value


class SourceReference(StrictModel):
    evidence_id: str
    quote: str


class DocumentItem(StrictModel):
    id: str
    title: str
    references: list[SourceReference] = Field(min_length=1)


class UserStory(DocumentItem):
    role: str | None
    need: str
    benefit: str | None
    acceptance_criteria: list[str]
    information_state: Literal['explicit', 'partial']


class RiskEntry(DocumentItem):
    description: str
    categories: list[str]
    impact: str | None
    likelihood: str | None
    status: str | None
    mitigation: str | None
    severity: str | None


class ActionItem(DocumentItem):
    description: str
    owner: str | None
    due_date: str | None
    status: str | None
    dependency: str | None


class ResultMetadata(StrictModel):
    status: Literal['ok', 'partial', 'insufficient_information']
    query: str
    generated_at: str
    provider: str
    evidence: list[Evidence]
    retrieved_count: int = Field(ge=0)
    evidence_limited: bool
    warnings: list[str]


class DocumentationResult(ResultMetadata):
    user_stories: list[UserStory]
    risks: list[RiskEntry]
    action_items: list[ActionItem]


class ScopeSignal(StrictModel):
    category: str
    state: Literal['known', 'unclear', 'missing']
    points: float = Field(ge=0, le=20)
    references: list[SourceReference]


class HealthDimension(StrictModel):
    id: Literal['scope_clarity', 'timeline_risk', 'blocker_health']
    label: str
    state: Literal['assessed', 'insufficient_information', 'conflicting_evidence']
    score: int | None = Field(default=None, ge=0, le=100)
    health_contribution: int | None = Field(default=None, ge=0, le=100)
    higher_is_better: bool
    weight: int
    count: int | None = Field(default=None, ge=0)
    explanation: str
    calculation: str
    references: list[SourceReference]
    scope_signals: list[ScopeSignal] = Field(default_factory=list)


class HealthResult(ResultMetadata):
    overall_score: int | None = Field(default=None, ge=0, le=100)
    interpretation: str
    assessed_dimensions: int = Field(ge=0, le=3)
    dimensions: list[HealthDimension]
    methodology_version: Literal['evidence-health-v1'] = 'evidence-health-v1'
    methodology: str


class ConversationMessage(StrictModel):
    role: Literal['user', 'assistant']
    content: str = Field(min_length=1, max_length=2000)


class AssistantRequest(StrictModel):
    question: str = Field(min_length=2, max_length=1000)
    history: list[ConversationMessage] = Field(default_factory=list, max_length=12)

    @field_validator('question')
    @classmethod
    def trim_question(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Enter a question with at least two non-space characters.')
        return value


class AnswerStatement(StrictModel):
    category: str
    reference: SourceReference
    owner: str | None = None
    due_date: str | None = None
    source_status: str | None = None
    severity: str | None = None


class AssistantResult(ResultMetadata):
    question: str
    resolved_question: str
    answer: str
    grounding: Literal['source_quotations', 'derived_health_assessment', 'insufficient_evidence']
    statements: list[AnswerStatement]
    health: HealthResult | None = None
    suggested_questions: list[str]
