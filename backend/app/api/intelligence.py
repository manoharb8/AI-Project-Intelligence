"""Additive Milestone 3 endpoints. Existing M1/M2 contracts remain unchanged."""
from fastapi import APIRouter, HTTPException, Request
from app.agents.documentation import DocumentationAgent
from app.agents.grounding import GroundingError
from app.intelligence.schemas import IntelligenceRequest, DocumentationResult, HealthResult, AssistantRequest, AssistantResult
from app.llm.base import ProviderError
from app.services.project_health import ProjectHealthService
from app.services.assistant import ProjectAssistant
from app.workspaces.context import knowledge_base, save_operation

router = APIRouter(prefix='/api', tags=['Milestone 3'])


def execute(request, operation):
    if not request.app.state.provider.status.ready:
        raise HTTPException(503, request.app.state.provider.status.message)
    try:
        return operation()
    except GroundingError as exc:
        raise HTTPException(502, 'The result could not be verified against retrieved project evidence. No unverified output was returned.') from exc
    except ProviderError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/documentation/generate', response_model=DocumentationResult)
def documentation(body: IntelligenceRequest, request: Request):
    kb = knowledge_base(request)
    return execute(request, lambda: save_operation(request, 'documentation', body.query, lambda: DocumentationAgent(kb, request.app.state.provider).run(body.query)))


@router.post('/project-health/assess', response_model=HealthResult)
def project_health(body: IntelligenceRequest, request: Request):
    kb = knowledge_base(request)
    return execute(request, lambda: save_operation(request, 'health', body.query, lambda: ProjectHealthService(kb, request.app.state.provider).run(body.query)))


@router.post('/assistant/query', response_model=AssistantResult)
def assistant(body: AssistantRequest, request: Request):
    kb = knowledge_base(request)
    return execute(request, lambda: save_operation(request, 'assistant', body.question, lambda: ProjectAssistant(kb, request.app.state.provider).run(body.question, body.history), body.history))
