"""Additive workspace contracts; existing analysis response models are reused."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.api.schemas import QueryResult
from app.agents.schemas import AnalysisResult
from app.intelligence.schemas import DocumentationResult, HealthResult, AssistantResult, ConversationMessage


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid')


class WorkspaceCreate(Model):
    name: str = Field(min_length=1, max_length=80)

    @field_validator('name')
    @classmethod
    def clean_name(cls, value):
        value = ' '.join(value.split())
        if not value or any(ord(c) < 32 for c in value):
            raise ValueError('Enter a project name.')
        return value


class WorkspaceRecord(Model):
    id: str = Field(pattern=r'^(legacy|[a-f0-9]{32})$')
    name: str
    created_at: str
    is_legacy: bool = False


class WorkspaceList(Model):
    default_workspace_id: str = 'legacy'
    workspaces: list[WorkspaceRecord]


class SavedBase(Model):
    key: str
    query: str
    source_version: str
    saved_at: str


class SavedRetrieval(SavedBase):
    kind: Literal['retrieval']
    result: QueryResult


class SavedAnalysis(SavedBase):
    kind: Literal['scope', 'risk', 'blockers']
    result: AnalysisResult


class SavedDocumentation(SavedBase):
    kind: Literal['documentation']
    result: DocumentationResult


class SavedHealth(SavedBase):
    kind: Literal['health']
    result: HealthResult


class SavedAssistant(SavedBase):
    kind: Literal['assistant']
    history: list[ConversationMessage] = Field(default_factory=list)
    result: AssistantResult


SavedResult = Annotated[SavedRetrieval | SavedAnalysis | SavedDocumentation | SavedHealth | SavedAssistant, Field(discriminator='kind')]


class ChatView(Model):
    id: int = Field(ge=1)
    question: str = Field(min_length=2, max_length=1000)
    result_key: str | None = Field(default=None, max_length=40000)
    error: str = Field(default='', max_length=4000)


class WorkspaceView(Model):
    retrieval_query: str = Field(default='', max_length=1000)
    scope_query: str = Field(default='', max_length=500)
    risk_query: str = Field(default='', max_length=500)
    blockers_query: str = Field(default='', max_length=500)
    documentation_query: str = Field(default='Review the uploaded project documents.', max_length=500)
    documentation_focus: str = Field(default='Review the uploaded project documents.', max_length=500)
    health_query: str = Field(default='Review the uploaded project documents.', max_length=500)
    health_focus: str = Field(default='Review the uploaded project documents.', max_length=500)
    doc_tab: Literal['user_stories', 'risks', 'action_items'] = 'user_stories'
    doc_filter: str = Field(default='', max_length=1000)
    action_filter: str = Field(default='all', max_length=1000)
    assistant_draft: str = Field(default='', max_length=1000)
    turns: list[ChatView] = Field(default_factory=list)


class WorkspaceState(Model):
    view: WorkspaceView = Field(default_factory=WorkspaceView)
    results: list[SavedResult] = Field(default_factory=list)


class WorkspaceSnapshot(WorkspaceState):
    workspace_id: str
    source_version: str
    indexed_sources: dict[str, int]
