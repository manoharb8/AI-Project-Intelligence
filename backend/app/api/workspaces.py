from typing import Literal
from fastapi import APIRouter, HTTPException, Request
from app.workspaces.schemas import WorkspaceCreate, WorkspaceList, WorkspaceRecord, WorkspaceSnapshot, WorkspaceView

router = APIRouter(prefix='/api/workspaces', tags=['Project workspaces'])


def checked(request, workspace_id):
    manager = request.app.state.workspaces
    try:
        manager.require(workspace_id)
    except KeyError as exc:
        raise HTTPException(404, 'Workspace not found. Select an existing project.') from exc
    header = request.headers.get('X-Workspace-ID')
    if header is not None and header != workspace_id:
        raise HTTPException(409, 'Workspace selection does not match this request.')
    return manager


@router.get('', response_model=WorkspaceList)
def list_workspaces(request: Request):
    return request.app.state.workspaces.list()


@router.post('', response_model=WorkspaceRecord, status_code=201)
def create_workspace(body: WorkspaceCreate, request: Request):
    try:
        return request.app.state.workspaces.create(body.name)
    except FileExistsError as exc:
        raise HTTPException(409, str(exc)) from exc


@router.get('/{workspace_id}/state', response_model=WorkspaceSnapshot)
def snapshot(workspace_id: str, request: Request):
    return checked(request, workspace_id).snapshot(workspace_id)


@router.put('/{workspace_id}/view', response_model=WorkspaceView)
def save_view(workspace_id: str, body: WorkspaceView, request: Request):
    return checked(request, workspace_id).save_view(workspace_id, body)


@router.get('/{workspace_id}/export')
def export_report(workspace_id: str, request: Request, format: Literal['pdf', 'docx']):
    """Download stored results only. Existing analysis endpoints remain unchanged."""
    from fastapi.responses import Response
    from app.exports.report import build_report
    from app.exports.render import pdf_bytes, word_bytes
    manager = checked(request, workspace_id)
    if any(doc['status'] == 'processing' for doc in manager.kb(workspace_id).list_documents()):
        raise HTTPException(409, 'Documents are still processing. Wait for indexing before exporting.')
    snapshot = manager.snapshot(workspace_id)
    if not any(entry.kind in ('scope', 'risk', 'blockers') for entry in snapshot.results):
        raise HTTPException(409, 'No saved project analysis is available. Wait for analysis to finish or retry the failed analysis.')
    name = next(w.name for w in manager.list().workspaces if w.id == workspace_id)
    report = build_report(name, snapshot)
    try:
        content = pdf_bytes(report) if format == 'pdf' else word_bytes(report)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    media = 'application/pdf' if format == 'pdf' else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    return Response(content, media_type=media, headers={
        'Content-Disposition': f'attachment; filename="project-report-{workspace_id}.{format}"',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Workspace-ID': workspace_id,
    })
