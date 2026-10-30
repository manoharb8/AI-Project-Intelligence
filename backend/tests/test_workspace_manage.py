"""Workspace project type, rename and delete, on real folders and a real Chroma store."""
import json
import pytest
from fastapi.testclient import TestClient
from app.llm.provider import ExtractiveProvider
from app.main import create_app
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService
from app.workspaces.service import WorkspaceManager


@pytest.fixture(scope='module')
def embeddings():
    return WordLlamaEmbeddings()


@pytest.fixture
def client(tmp_path, embeddings):
    kb = KnowledgeBaseService(tmp_path, embeddings)
    kb.ingest('original.txt', b'Project goal: Atlas ticket management. Priya owns API development.')
    with TestClient(create_app(kb, ExtractiveProvider())) as c:
        yield c


def make(c, name='Alpha', **extra):
    r = c.post('/api/workspaces', json={'name': name, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def test_type_defaults_to_code_is_stored_and_survives_restart(client, tmp_path, embeddings):
    assert client.get('/api/workspaces').json()['workspaces'][0]['project_type'] == 'code'
    a, b, c = make(client, 'A'), make(client, 'B', project_type='uiux'), make(client, 'C', project_type='code')
    assert (a['project_type'], b['project_type'], c['project_type']) == ('code', 'uiux', 'code')
    assert client.post('/api/workspaces', json={'name': 'D', 'project_type': 'game'}).status_code == 422
    kb = KnowledgeBaseService(tmp_path, embeddings)
    types = {w.name: w.project_type for w in WorkspaceManager(kb).list().workspaces}
    assert types == {'Current project': 'code', 'A': 'code', 'B': 'uiux', 'C': 'code'}


def test_registry_written_before_types_existed_still_loads_as_code(tmp_path, embeddings):
    (tmp_path / 'workspaces.json').write_text(json.dumps({'default_workspace_id': 'legacy', 'workspaces': [
        {'id': 'legacy', 'name': 'Current project', 'created_at': 'x', 'is_legacy': True},
        {'id': 'a' * 32, 'name': 'Old one', 'created_at': 'x', 'is_legacy': False}]}))
    manager = WorkspaceManager(KnowledgeBaseService(tmp_path, embeddings))
    assert [w.project_type for w in manager.list().workspaces] == ['code', 'code']


def test_rename_changes_only_the_name_and_keeps_data(client):
    ws = make(client, 'Alpha')
    h = {'X-Workspace-ID': ws['id']}
    client.post('/api/documents/upload', headers=h, files={'files': ('n.txt', 'Goal: ship the portal. Maria owns testing.')})
    r = client.patch(f"/api/workspaces/{ws['id']}", json={'name': '  Beta   project '})
    assert r.status_code == 200 and r.json()['name'] == 'Beta project' and r.json()['id'] == ws['id']
    assert r.json()['project_type'] == ws['project_type']
    assert [d['filename'] for d in client.get('/api/knowledge-base', headers=h).json()['documents']] == ['n.txt']
    assert 'Beta project' in [w['name'] for w in client.get('/api/workspaces').json()['workspaces']]
    assert client.patch(f"/api/workspaces/{ws['id']}", json={'name': 'beta PROJECT'}).status_code == 200   # same workspace, case change
    other = make(client, 'Other')
    assert client.patch(f"/api/workspaces/{other['id']}", json={'name': 'BETA project'}).status_code == 409
    assert client.patch(f"/api/workspaces/{other['id']}", json={'name': '  '}).status_code == 422
    assert client.patch(f"/api/workspaces/{other['id']}", json={'name': 'ok', 'project_type': 'uiux'}).status_code == 422
    assert client.patch('/api/workspaces/' + 'f' * 32, json={'name': 'x'}).status_code == 404
    assert client.patch('/api/workspaces/legacy', json={'name': 'Atlas'}).json()['is_legacy'] is True


def test_delete_removes_everything_for_that_workspace_only(client, tmp_path):
    keep, gone = make(client, 'Keep'), make(client, 'Gone', project_type='uiux')
    for ws in (keep, gone):
        client.post('/api/documents/upload', headers={'X-Workspace-ID': ws['id']}, files={'files': ('n.txt', 'Goal: ship the portal. Maria owns testing.')})
        client.put(f"/api/workspaces/{ws['id']}/view", headers={'X-Workspace-ID': ws['id']}, json={'retrieval_query': 'mine'})
    folder = tmp_path / 'workspaces' / gone['id']
    assert (folder / 'chroma').exists() and (folder / 'workspace-state.json').exists()
    r = client.delete(f"/api/workspaces/{gone['id']}")
    assert r.status_code == 200 and r.json() == {'id': gone['id'], 'deleted': True, 'cleanup_pending': False}
    assert not folder.exists()
    ids = [w['id'] for w in client.get('/api/workspaces').json()['workspaces']]
    assert gone['id'] not in ids and keep['id'] in ids
    assert client.get('/api/knowledge-base', headers={'X-Workspace-ID': gone['id']}).status_code == 404
    assert client.put(f"/api/workspaces/{gone['id']}/view", headers={'X-Workspace-ID': gone['id']}, json={}).status_code == 404
    assert client.delete(f"/api/workspaces/{gone['id']}").status_code == 404
    kept = client.get('/api/knowledge-base', headers={'X-Workspace-ID': keep['id']}).json()
    assert kept['indexed_documents'] == 1
    assert client.get(f"/api/workspaces/{keep['id']}/state", headers={'X-Workspace-ID': keep['id']}).json()['view']['retrieval_query'] == 'mine'
    # the original project is untouched and cannot be deleted
    assert client.get('/api/knowledge-base').json()['indexed_documents'] == 1
    r = client.delete('/api/workspaces/legacy')
    assert r.status_code == 409 and 'cannot be deleted' in r.json()['detail']
    assert client.get('/api/knowledge-base').json()['indexed_documents'] == 1
    # same name can be reused after deletion
    assert make(client, 'Gone')['id'] != gone['id']


def test_delete_with_header_mismatch_is_refused(client):
    a, b = make(client, 'A'), make(client, 'B')
    assert client.delete(f"/api/workspaces/{a['id']}", headers={'X-Workspace-ID': b['id']}).status_code == 409
    assert len(client.get('/api/workspaces').json()['workspaces']) == 3


def test_locked_folder_is_cleaned_up_on_next_start(client, tmp_path, embeddings, monkeypatch):
    import app.workspaces.service as svc
    ws = make(client, 'Stuck')
    real = svc.remove_tree
    monkeypatch.setattr(svc, 'remove_tree', lambda path, attempts=5: False)       # simulate a Windows file lock
    r = client.delete(f"/api/workspaces/{ws['id']}")
    assert r.status_code == 200 and r.json()['cleanup_pending'] is True
    assert (tmp_path / 'workspaces' / ws['id']).exists()
    assert ws['id'] not in [w['id'] for w in client.get('/api/workspaces').json()['workspaces']]   # already gone from the registry
    monkeypatch.setattr(svc, 'remove_tree', real)
    WorkspaceManager(KnowledgeBaseService(tmp_path, embeddings))
    assert not (tmp_path / 'workspaces' / ws['id']).exists()
    assert json.loads((tmp_path / 'workspaces-deleted.json').read_text()) == []


def test_sweep_never_deletes_a_live_workspace(client, tmp_path, embeddings):
    ws = make(client, 'Live')
    (tmp_path / 'workspaces-deleted.json').write_text(json.dumps([ws['id'], '../../etc', 'not-an-id']))
    WorkspaceManager(KnowledgeBaseService(tmp_path, embeddings))
    assert (tmp_path / 'workspaces' / ws['id']).exists()
