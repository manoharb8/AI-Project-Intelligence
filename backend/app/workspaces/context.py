from fastapi import HTTPException
from app.workspaces.service import result_key


def workspace_id(request):
    ident = request.headers.get('X-Workspace-ID', 'legacy')
    try:
        return request.app.state.workspaces.require(ident)
    except KeyError as exc:
        raise HTTPException(404, 'Workspace not found. Select an existing project.') from exc


def knowledge_base(request):
    return request.app.state.workspaces.kb(workspace_id(request))


def save_operation(request, kind, query, operation, history=()):
    manager = request.app.state.workspaces
    ident = workspace_id(request)
    key = result_key(kind, query, history)
    token, version = manager.begin(ident, key)
    try:
        result = operation()
        manager.complete(ident, kind, query, result, token, version, history)
        return result
    finally:
        manager.finish(ident, key, token)
