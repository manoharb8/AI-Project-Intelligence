"""Final-release workflow through real APIs, parsers, WordLlama and Chroma.

All added project statements are isolated validation inputs in temporary storage.
No runtime project database or historical source document is changed.
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.llm.provider import ExtractiveProvider
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService

ROOT = Path(__file__).resolve().parents[2]
UPDATE = (
    'Sprint update: The integration-testing milestone is delayed because staging access is unavailable.\n'
    'Action item: Ravi must restore staging access. Owner: Ravi. Status: Blocked.\n'
    'Dependency: Integration testing depends on staging access.\n'
    'No revised delivery date has been confirmed.\n'
)

@pytest.fixture(scope='module')
def embeddings():
    return WordLlamaEmbeddings()


def assert_grounded(result):
    evidence = {item['id']: item['text'] for item in result['evidence']}
    if 'user_stories' in result:
        references = [ref for item in result['user_stories'] + result['risks'] + result['action_items'] for ref in item['references']]
    elif 'dimensions' in result:
        references = [ref for item in result['dimensions'] for ref in item['references']]
    elif 'statements' in result:
        references = [item['reference'] for item in result['statements']]
    else:
        references = result['findings']
    assert references, result
    assert all(ref['evidence_id'] in evidence and ref['quote'] in evidence[ref['evidence_id']] for ref in references)


def test_incremental_four_format_workflow_preserves_sources_and_updates_intelligence(tmp_path, embeddings):
    kb = KnowledgeBaseService(tmp_path, embeddings)
    with TestClient(create_app(kb, ExtractiveProvider())) as client:
        initial = client.get('/api/knowledge-base').json()
        assert initial['document_count'] == initial['chunk_count'] == 0
        paths = sorted((ROOT / 'samples').iterdir())
        assert {p.suffix for p in paths} == {'.pdf', '.docx', '.csv', '.txt'}
        uploaded = client.post('/api/documents/upload', files=[('files', (p.name, p.read_bytes())) for p in paths])
        assert uploaded.status_code == 200, uploaded.text
        assert all(doc['indexed'] for doc in uploaded.json()['documents'])
        before = client.get('/api/knowledge-base').json()
        original_ids = {doc['id'] for doc in before['documents']}
        assert before['document_count'] == before['indexed_documents'] == 4
        search = client.post('/api/retrieval/query', json={'query': 'ticket API deliverable'}).json()
        assert search['results']
        original_passages = {p['id']: p['text'] for p in search['results']}
        for agent in ['scope', 'risk', 'blockers']:
            result = client.post(f'/api/agents/{agent}', json={})
            assert result.status_code == 200, result.text
            assert_grounded(result.json())
        old_health = client.post('/api/project-health/assess', json={}).json()
        result = client.post('/api/documents/upload', files={'files': ('incremental_update.txt', UPDATE.encode())})
        assert result.status_code == 200 and result.json()['documents'][0]['indexed']
        new_id = result.json()['documents'][0]['id']
        after = client.get('/api/knowledge-base').json()
        assert after['document_count'] == after['indexed_documents'] == 5
        assert after['chunk_count'] > before['chunk_count']
        assert original_ids < {doc['id'] for doc in after['documents']}
        retrieved = client.post('/api/retrieval/query', json={'query': 'integration testing staging access unavailable', 'top_k': 10}).json()
        assert any(p['document_id'] == new_id for p in retrieved['results'])
        original_search = client.post('/api/retrieval/query', json={'query': 'ticket API deliverable', 'top_k': 10}).json()
        assert all(any(p['id'] == identity and p['text'] == quote for p in original_search['results']) for identity, quote in original_passages.items())
        documentation = client.post('/api/documentation/generate', json={}).json()
        health = client.post('/api/project-health/assess', json={}).json()
        assistant = client.post('/api/assistant/query', json={'question': 'What dependencies are causing delays?'}).json()
        for output in [documentation, health, assistant]:
            assert_grounded(output)
            assert any(p['document_id'] == new_id for p in output['evidence'])
        assert health['methodology_version'] == old_health['methodology_version'] == 'evidence-health-v1'
        assert health['methodology'] == old_health['methodology']
        assert [d['weight'] for d in health['dimensions']] == [40, 35, 25]
        unknown = client.post('/api/assistant/query', json={'question': 'What is the project delivery probability?'}).json()
        assert unknown['status'] == 'insufficient_information' and not unknown['statements']
    # Restart the service against the same persistent storage: no reset/re-upload.
    restored = KnowledgeBaseService(tmp_path, embeddings)
    assert restored.summary()['indexed_documents'] == 5
    assert original_ids | {new_id} == {doc['id'] for doc in restored.list_documents()}


def test_failed_incremental_file_does_not_damage_existing_index(tmp_path, embeddings):
    kb = KnowledgeBaseService(tmp_path, embeddings)
    with TestClient(create_app(kb, ExtractiveProvider())) as client:
        good = client.post('/api/documents/upload', files={'files': ('progress.txt', UPDATE.encode())}).json()['documents'][0]
        before = client.get('/api/knowledge-base').json()
        failed = client.post('/api/documents/upload', files={'files': ('broken.pdf', b'not a PDF')})
        assert failed.status_code == 200
        assert failed.json()['documents'][0]['status'] == 'error'
        after = client.get('/api/knowledge-base').json()
        assert after['indexed_documents'] == before['indexed_documents'] == 1
        assert after['chunk_count'] == before['chunk_count']
        assert after['document_count'] == 2
        retrieval = client.post('/api/retrieval/query', json={'query': 'staging access integration testing'}).json()
        assert retrieval['results'] and all(p['document_id'] == good['id'] for p in retrieval['results'])
        assert_grounded(client.post('/api/documentation/generate', json={}).json())
