"""Three independently callable agent endpoints with safe failures."""
from fastapi import APIRouter,Request,HTTPException
from app.agents.schemas import AnalysisRequest,AnalysisResult,AgentAvailability
from app.agents.scope_deliverables import ScopeDeliverablesAgent
from app.agents.risk_forecast import RiskForecastAgent
from app.agents.blockers_actions import BlockersActionsAgent
from app.agents.grounding import GroundingError
from app.llm.base import ProviderError

router=APIRouter(prefix='/api/agents',tags=['Milestone 2'])
AGENTS={'scope':ScopeDeliverablesAgent,'risk':RiskForecastAgent,'blockers':BlockersActionsAgent}

@router.get('/status',response_model=AgentAvailability)
def status(request:Request):
    p=request.app.state.provider.status
    return dict(provider=p.name,mode=p.mode,ready=p.ready,message=p.message,agents=list(AGENTS))


def analyze(kind,body,request):
    if not request.app.state.provider.status.ready:
        raise HTTPException(503,request.app.state.provider.status.message)
    try:
        return AGENTS[kind](request.app.state.kb,request.app.state.provider).run(body.query)
    except GroundingError as exc:
        raise HTTPException(502,'The analysis could not be verified against the retrieved evidence. No unverified findings were returned.') from exc
    except ProviderError as exc:
        raise HTTPException(503,str(exc)) from exc

@router.post('/scope',response_model=AnalysisResult)
def scope(body:AnalysisRequest,request:Request):return analyze('scope',body,request)

@router.post('/risk',response_model=AnalysisResult)
def risk(body:AnalysisRequest,request:Request):return analyze('risk',body,request)

@router.post('/blockers',response_model=AnalysisResult)
def blockers(body:AnalysisRequest,request:Request):return analyze('blockers',body,request)
