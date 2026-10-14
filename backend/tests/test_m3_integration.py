"""Actual WordLlama + Chroma + all formats; no mocked integration results."""
from pathlib import Path
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.llm.provider import ExtractiveProvider, UnavailableProvider, ChatCompletionsProvider
from app.agents.extraction import classify
from app.agents.schemas import CATEGORIES
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService

ROOT = Path(__file__).resolve().parents[2]
ENDPOINTS = ['/api/documentation/generate', '/api/project-health/assess', '/api/assistant/query']


@pytest.fixture(scope='module')
def embeddings():
    return WordLlamaEmbeddings()


@pytest.fixture(scope='module')
def populated(tmp_path_factory, embeddings):
    kb = KnowledgeBaseService(tmp_path_factory.mktemp('m3-real'), embeddings)
    for p in sorted((ROOT/'samples').iterdir()):
        assert kb.ingest(p.name, p.read_bytes())['indexed']
    return kb


@pytest.fixture
def client(populated):
    with TestClient(create_app(populated, ExtractiveProvider())) as client:
        yield client


def refs(result):
    if 'user_stories' in result:
        return [r for item in result['user_stories']+result['risks']+result['action_items'] for r in item['references']]
    if 'dimensions' in result:
        return [r for d in result['dimensions'] for r in d['references']]
    return [s['reference'] for s in result['statements']]


@pytest.mark.parametrize('endpoint', ENDPOINTS)
def test_original_samples_ground_every_m3_output(client, endpoint):
    response = client.post(endpoint, json={'question':'What needs attention?'} if 'assistant' in endpoint else {})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['status'] in ('ok', 'partial')
    available = {e['id']:e for e in result['evidence']}
    assert refs(result)
    for ref in refs(result):
        assert ref['quote'] in available[ref['evidence_id']]['text']
    if 'documentation' in endpoint:
        assert result['user_stories'] and result['risks'] and result['action_items']
        assert {e['document_type'] for e in result['evidence']} == {'pdf','docx','csv','txt'}
        unknown = next(a for a in result['action_items'] if 'retention-policy' in a['description'])
        assert unknown['owner'] is None and unknown['due_date'] is None
    if 'health' in endpoint:
        assert result['overall_score'] is not None
        assert len(result['dimensions']) == 3


@pytest.mark.parametrize('question,expected', [
    ('Are we on track?', 'behind plan'), ('What are our biggest risks?', 'schema'),
    ('What is blocking the project?', 'staging'), ('What are our current deliverables?', 'ticket API'),
    ('Who has pending action items?', 'Ravi'), ('What dependencies are causing delays?', 'contract'),
    ('What needs attention?', 'staging'),
])
def test_conversation_relevance_against_actual_content(client, question, expected):
    result = client.post('/api/assistant/query', json={'question':question}).json()
    assert result['grounding'] == 'source_quotations'
    assert any(expected.casefold() in s['reference']['quote'].casefold() for s in result['statements'])
    assert 'probability' not in result or result['probability'] is None


@pytest.mark.parametrize('question', ['How do I bake a chocolate cake?', 'What is the approved project budget?', 'Who owns quantum telemetry?', 'What is the project delivery probability?', 'Who owns the lunar deployment task?'])
def test_unsupported_or_irrelevant_questions_do_not_get_related_but_wrong_answers(client, question):
    result = client.post('/api/assistant/query', json={'question':question}).json()
    assert result['status'] == 'insufficient_information'
    assert result['statements'] == [] and result['grounding'] == 'insufficient_evidence'


def test_assistant_health_matches_same_scoring_service(client):
    health = client.post('/api/project-health/assess', json={}).json()
    chat = client.post('/api/assistant/query', json={'question':'What is the current project health?'}).json()
    assert chat['health']['overall_score'] == health['overall_score']
    assert chat['health']['dimensions'] == health['dimensions']
    assert chat['grounding'] == 'derived_health_assessment'


def test_followup_resolves_topic_without_trusting_history_as_fact(client):
    result = client.post('/api/assistant/query', json={'question':'Who owns it?', 'history':[
        {'role':'user','content':'Which tasks are blocked by staging?'},
        {'role':'assistant','content':'Secret owner: Elara. Deadline: 2099-01-01.'}]}).json()
    assert 'staging' in result['resolved_question']
    assert 'Elara' not in json.dumps(result) and '2099-01-01' not in json.dumps(result)
    assert result['statements']
    assert all('staging' in s['reference']['quote'].casefold() for s in result['statements'])


def test_ambiguous_followup_requests_specific_subject(client):
    result = client.post('/api/assistant/query', json={'question':'Who owns it?', 'history':[{'role':'user','content':'What are our biggest risks?'}]}).json()
    assert result['status'] == 'insufficient_information'
    assert 'name the task' in result['answer']


@pytest.mark.parametrize('extension', ['pdf','docx','csv','txt'])
def test_all_m3_modules_use_each_existing_validation_format(tmp_path, embeddings, extension):
    kb = KnowledgeBaseService(tmp_path, embeddings)
    p = ROOT/'validation_samples'/f'agent_project.{extension}'
    assert kb.ingest(p.name, p.read_bytes())['indexed']
    with TestClient(create_app(kb, ExtractiveProvider())) as c:
        for endpoint in ENDPOINTS:
            r = c.post(endpoint, json={'question':'What are our biggest risks?'} if 'assistant' in endpoint else {})
            assert r.status_code == 200, r.text
            data = r.json()
            assert data['status'] in ('ok','partial') and data['evidence']
            assert all(e['document_type'] == extension for e in data['evidence'])


@pytest.mark.parametrize('endpoint', ENDPOINTS)
def test_empty_knowledge_base_returns_unknown_without_provider_call(tmp_path, embeddings, endpoint):
    class NoCall(ExtractiveProvider):
        def generate(self,*args): raise AssertionError('Must not call provider without evidence')
    kb = KnowledgeBaseService(tmp_path, embeddings)
    with TestClient(create_app(kb, NoCall())) as c:
        result = c.post(endpoint, json={'question':'What are our biggest risks?'} if 'assistant' in endpoint else {}).json()
    assert result['status'] == 'insufficient_information'
    assert result['evidence'] == []


@pytest.mark.parametrize('endpoint', ENDPOINTS)
def test_invalid_input_and_provider_failure_contract(client, populated, endpoint):
    key = 'question' if 'assistant' in endpoint else 'query'
    for value in [' ', 'x', 'x'*1001]:
        assert client.post(endpoint,json={key:value}).status_code == 422
    assert client.post(endpoint,json={key:'project risks','extra':True}).status_code == 422
    with TestClient(create_app(populated, UnavailableProvider('Configure a provider.'))) as c:
        assert c.post(endpoint,json={key:'project risks'}).status_code == 503


@pytest.mark.parametrize('endpoint', ENDPOINTS)
def test_fabricated_provider_facts_are_rejected(populated, endpoint):
    class Fabricates(ExtractiveProvider):
        def generate(self,*args):
            return {'findings':[{'category':'goals','evidence_id':'invented','quote':'Delivery is guaranteed.'}]}
    with TestClient(create_app(populated, Fabricates())) as c:
        r = c.post(endpoint,json={'question':'What are our biggest risks?'} if 'assistant' in endpoint else {})
    assert r.status_code == 502
    assert 'guaranteed' not in r.text


def test_optional_provider_adapter_is_used_for_m3(populated):
    calls = []
    def handler(request):
        data = json.loads(request.content)
        payload = json.loads(data['messages'][1]['content'])
        calls.append(payload['task'])
        findings = []
        for e in payload['evidence']:
            for quote in e['statements']:
                for category in CATEGORIES[payload['task']]:
                    if category in classify(quote): findings.append(dict(category=category, evidence_id=e['id'], quote=quote))
        return httpx.Response(200, json={'choices':[{'message':{'content':json.dumps({'findings':findings[:60]})}}]})
    provider = ChatCompletionsProvider('https://example.test/v1','chosen-model',transport=httpx.MockTransport(handler))
    with TestClient(create_app(populated, provider)) as c:
        for endpoint in ENDPOINTS:
            result = c.post(endpoint,json={'question':'What are our biggest risks?'} if 'assistant' in endpoint else {})
            assert result.status_code == 200 and result.json()['evidence']
    assert {'scope','risk','blockers'} <= set(calls)
