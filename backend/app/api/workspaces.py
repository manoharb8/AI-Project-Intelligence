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
