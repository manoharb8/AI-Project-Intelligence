"""Workspace isolation with the real WordLlama/Chroma stack and approved samples."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import hashlib
import subprocess
import sys
import threading
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.llm.provider import ExtractiveProvider
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService
from app.services.project_health import ProjectHealthService
from app.workspaces.service import WorkspaceManager, result_key

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope='module')
def embeddings():
    return WordLlamaEmbeddings()


@pytest.fixture
def client(tmp_path, embeddings):
    kb = KnowledgeBaseService(tmp_path, embeddings)
    kb.ingest('original.txt', b'Project goal: Atlas ticket management. Deliverables: ticket API. Priya owns API development.')
    with TestClient(create_app(kb, ExtractiveProvider())) as c:
        yield c


def create(client, name='Separate project'):
    response = client.post('/api/workspaces', json={'name': name})
    assert response.status_code == 201, response.text
    ident = response.json()['id']
    return ident, {'X-Workspace-ID': ident}


def upload(client, headers, text, filename='notes.txt'):
    response = client.post('/api/documents/upload', headers=headers, files={'files': (filename, text)})
    assert response.status_code == 200, response.text
    doc = response.json()['documents'][0]
    assert doc['indexed'], doc
    return doc


def test_legacy_is_registered_in_place_and_new_workspace_starts_empty(client):
    kb = client.app.state.kb
    manifest = kb.manifest_path.read_bytes()
    docs = kb.list_documents()
    registry = client.get('/api/workspaces').json()
    assert registry['default_workspace_id'] == 'legacy'
    assert len(registry['workspaces']) == 1
    assert registry['workspaces'][0]['is_legacy']
    ident, headers = create(client)
    assert client.get('/api/knowledge-base', headers=headers).json()['documents'] == []
    assert client.get(f'/api/workspaces/{ident}/state', headers=headers).json()['results'] == []
    assert client.get('/api/documents').json() == docs
    assert kb.manifest_path.read_bytes() == manifest
    assert client.app.state.workspaces.kb('legacy') is kb
    assert client.app.state.workspaces.kb(ident).data_dir == kb.data_dir / 'workspaces' / ident


@pytest.mark.parametrize('endpoint,body,field', [
    ('/api/retrieval/query', {'query': 'project deliverables'}, 'results'),
    ('/api/agents/scope', {}, 'evidence'), ('/api/agents/risk', {}, 'evidence'),
    ('/api/agents/blockers', {}, 'evidence'), ('/api/documentation/generate', {}, 'evidence'),
    ('/api/project-health/assess', {}, 'evidence'),
    ('/api/assistant/query', {'question': 'What needs attention?'}, 'evidence'),
])
def test_each_existing_intelligence_path_uses_only_selected_sources(client, endpoint, body, field):
    ident, headers = create(client)
    for sample in sorted((ROOT / 'samples').iterdir()):
        upload(client, headers, sample.read_bytes(), sample.name)
    ids = {d['id'] for d in client.get('/api/documents', headers=headers).json()}
    original_ids = {d['id'] for d in client.get('/api/documents').json()}
    result = client.post(endpoint, headers=headers, json=body)
    assert result.status_code == 200, result.text
    data = result.json()
    assert data[field]
    assert {e['document_id'] for e in data[field]} <= ids
    assert not ({e['document_id'] for e in data[field]} & original_ids)
    snapshot = client.get(f'/api/workspaces/{ident}/state', headers=headers).json()
    assert snapshot['results'][-1]['result'] == data
    assert client.get('/api/workspaces/legacy/state').json()['results'] == []
    assert {d['document_type'] for d in client.get('/api/documents', headers=headers).json()} == {'pdf','docx','csv','txt'}
    if 'health' in endpoint:
        direct = ProjectHealthService(client.app.state.workspaces.kb(ident), ExtractiveProvider()).run(data['query'])
        assert data['overall_score'] == direct.overall_score
        assert data['dimensions'] == [d.model_dump(mode='json') for d in direct.dimensions]


def test_empty_workspace_does_not_inherit_other_project_health_or_facts(client):
    _, headers = create(client)
    for endpoint, body in [('/api/project-health/assess', {}), ('/api/documentation/generate', {}),
                           ('/api/assistant/query', {'question': 'Who owns API development?'})]:
        response = client.post(endpoint, headers=headers, json=body)
        assert response.status_code == 200, response.text
        result = response.json()
        assert result['status'] == 'insufficient_information' and result['evidence'] == []
        assert 'Priya' not in json.dumps(result)
        if 'overall_score' in result:
            assert result['overall_score'] is None
            assert all(d['score'] is None for d in result['dimensions'])


def test_identical_filenames_and_concurrent_uploads_are_isolated(client):
    first, h1 = create(client, 'Alpha')
    second, h2 = create(client, 'Beta')
    barrier = threading.Barrier(2)
    def ingest(headers, text):
        barrier.wait(timeout=10)
        return upload(client, headers, text, 'same.txt')
    with ThreadPoolExecutor(max_workers=2) as pool:
        a = pool.submit(ingest, h1, b'Deliverable: Alpha API. Alpha API owner: Amrita. Alpha API is delayed.')
        b = pool.submit(ingest, h2, b'Deliverable: Beta reporting. Beta reporting owner: Ben. Beta reporting is blocked.')
        da, db = a.result(timeout=30), b.result(timeout=30)
    assert da['id'] != db['id']
    for ident, headers, expected, forbidden, query in [(first,h1,da,db,'Alpha API owner Amrita'),(second,h2,db,da,'Beta reporting owner Ben')]:
        assert client.get('/api/documents', headers=headers).json() == [expected]
        result = client.post('/api/retrieval/query',headers=headers,json={'query':query}).json()
        assert result['results'] and all(e['document_id'] == expected['id'] for e in result['results'])
        assert forbidden['id'] not in json.dumps(client.get(f'/api/workspaces/{ident}/state',headers=headers).json())


def test_restart_restores_registry_sources_typed_results_and_view(client):
    ident, headers = create(client)
    document = upload(client, headers, b'Action item: review the import policy. Owner: Mira. Due date: Not stated.')
    result = client.post('/api/retrieval/query', headers=headers, json={'query':'import policy'}).json()
    state = client.get(f'/api/workspaces/{ident}/state', headers=headers).json()
    state['view']['retrieval_query'] = 'import policy'
    state['view']['assistant_draft'] = 'Which project actions remain?'
    assert client.put(f'/api/workspaces/{ident}/view', headers=headers,json=state['view']).status_code == 200
    code = '''import json,sys
from pathlib import Path
from app.services.knowledge_base import KnowledgeBaseService
from app.workspaces.service import WorkspaceManager
class ReadOnlyEmbeddings:
    def embed(self, texts): raise AssertionError('Restore must not rerun analysis or embeddings')
m=WorkspaceManager(KnowledgeBaseService(Path(sys.argv[1]),ReadOnlyEmbeddings()))
print(json.dumps({'registry':m.list().model_dump(),'snapshot':m.snapshot(sys.argv[2]).model_dump(mode='json'),'documents':m.kb(sys.argv[2]).list_documents()}))
'''
    output = subprocess.check_output([sys.executable,'-c',code,str(client.app.state.kb.data_dir),ident],text=True,cwd=ROOT/'backend')
    loaded = json.loads(output)
    assert loaded['documents'] == [document]
    assert loaded['snapshot']['results'][0]['result'] == result
    assert loaded['snapshot']['view'] == state['view']
    assert loaded['registry'] == client.get('/api/workspaces').json()


@pytest.mark.parametrize('bad', ['unknown', '../legacy', '', 'a'*32])
def test_unknown_workspace_fails_closed_instead_of_using_legacy(client,bad):
    response = client.get('/api/documents',headers={'X-Workspace-ID':bad})
    assert response.status_code == 404
    assert 'original.txt' not in response.text


def test_view_path_mismatch_validation_and_duplicate_names(client):
    ident, headers = create(client, '  Separate   project  ')
    assert client.get('/api/workspaces').json()['workspaces'][1]['name'] == 'Separate project'
    assert client.post('/api/workspaces',json={'name':'separate project'}).status_code == 409
    for name in ['', '   ', 'x'*81]:
        assert client.post('/api/workspaces',json={'name':name}).status_code == 422
    assert client.get('/api/workspaces/legacy/state',headers=headers).status_code == 409
    assert client.put(f'/api/workspaces/{ident}/view',headers=headers,json={'results':[]}).status_code == 422


def test_saved_results_keep_previous_data_but_reject_obsolete_source_or_request(client):
    manager = client.app.state.workspaces
    query='project deliverables'
    key=result_key('retrieval',query)
    response=client.post('/api/retrieval/query',json={'query':query}).json()
    original=manager.snapshot('legacy').results
    token,version=manager.begin('legacy',key)
    upload(client, {}, b'Deliverable: a second approved project report.')
    manager.complete('legacy','retrieval',query,response,token,version)
    assert manager.snapshot('legacy').results == original
    assert manager.snapshot('legacy').source_version != original[0].source_version
    old_token,version=manager.begin('legacy',key)
    new_token,version=manager.begin('legacy',key)
    manager.complete('legacy','retrieval',query,{**response,'message':'new result'},new_token,version)
    manager.complete('legacy','retrieval',query,{**response,'message':'late old result'},old_token,version)
    assert manager.snapshot('legacy').results[0].result.message == 'new result'


def test_failed_operation_preserves_cached_result_and_releases_request_token(client,monkeypatch):
    client.post('/api/retrieval/query',json={'query':'project deliverables'})
    manager=client.app.state.workspaces
    before=manager.snapshot('legacy').results
    def fail(*args):
        raise RuntimeError('test provider failure')
    monkeypatch.setattr(client.app.state.kb,'query',fail)
    with pytest.raises(RuntimeError):
        client.post('/api/retrieval/query',json={'query':'project deliverables'})
    assert manager.snapshot('legacy').results == before
    assert manager.tokens == {}


def test_corrupt_registry_is_not_overwritten(client):
    manager=client.app.state.workspaces
    manager.registry_path.write_text('{invalid')
    with pytest.raises(ValueError):
        WorkspaceManager(client.app.state.kb)
    assert manager.registry_path.read_text() == '{invalid'
    assert client.app.state.kb.summary()['indexed_documents'] == 1


def test_snapshot_version_and_indexed_sources_remain_consistent_during_ingestion(client,monkeypatch):
    kb=client.app.state.kb
    before=kb.list_documents()
    after=before+[dict(id='newly-indexed',indexed=True,chunk_count=2)]
    responses=iter([before,after])
    monkeypatch.setattr(kb,'list_documents',lambda:next(responses))
    state=client.app.state.workspaces.snapshot('legacy')
    expected=hashlib.sha256(json.dumps(sorted(state.indexed_sources.items())).encode()).hexdigest()
    assert state.source_version == expected
