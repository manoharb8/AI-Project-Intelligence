"""Flowchart analysis endpoints. Workspace is chosen by the same X-Workspace-ID header as every other API."""
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.config import MAX_FILE_BYTES
from app.flowchart import settings
from app.flowchart.schemas import FlowchartAnalysis, FlowchartDeleted, FlowchartSummary, FlowchartUploadResult, VisionAvailability
from app.flowchart.service import FlowchartError, FlowchartService
from app.flowchart.store import FlowchartStore, StoreError
from app.workspaces.context import workspace_id

router = APIRouter(prefix='/api/flowcharts', tags=['Flowchart analysis'])


def _store(request):
    ident = workspace_id(request)
    return FlowchartStore(request.app.state.workspaces.directory(ident)), request.app.state.workspaces.project_type(ident)


@router.get('/status', response_model=VisionAvailability)
def status(request: Request):
    s = request.app.state.vision.status
    return dict(provider=s.name, mode=s.mode, model=s.model, ready=s.ready, message=s.message,
                accepted_formats=['png', 'jpg', 'jpeg', 'webp', 'pdf'], max_file_mb=MAX_FILE_BYTES // (1024 * 1024),
                pdf_max_pages=settings.pdf_max_pages())


@router.get('', response_model=list[FlowchartSummary])
def list_analyses(request: Request):
    return _store(request)[0].list()


@router.post('/analyze', response_model=FlowchartUploadResult)
async def analyze(request: Request, file: UploadFile = File(...)):
    store, project_type = _store(request)
    vision = request.app.state.vision
    if not vision.status.ready:
        raise HTTPException(503, vision.status.message)
    try:
        data = await file.read(MAX_FILE_BYTES + 1)
    finally:
        await file.close()
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, f'The file exceeds the {MAX_FILE_BYTES // (1024 * 1024)} MB limit.')
    try:
        return await run_in_threadpool(FlowchartService(vision).analyze_upload, store, project_type, file.filename or 'flowchart', data)
    except FlowchartError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc


@router.get('/{analysis_id}', response_model=FlowchartAnalysis)
def get_analysis(analysis_id: str, request: Request):
    try:
        return _store(request)[0].get(analysis_id)
    except KeyError as exc:
        raise HTTPException(404, 'Flowchart analysis not found in this workspace.') from exc
    except StoreError as exc:
        raise HTTPException(500, str(exc)) from exc


@router.delete('/{analysis_id}', response_model=FlowchartDeleted)
def delete_analysis(analysis_id: str, request: Request):
    try:
        _store(request)[0].delete(analysis_id)
    except KeyError as exc:
        raise HTTPException(404, 'Flowchart analysis not found in this workspace.') from exc
    return FlowchartDeleted(id=analysis_id)
