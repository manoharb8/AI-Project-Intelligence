"""Concise answers and incremental mentor-demo workflow; real evidence retained."""
from pathlib import Path
from types import SimpleNamespace as S
from io import BytesIO
import pytest
from fastapi.testclient import TestClient
from docx import Document
from pypdf import PdfReader
from app.main import create_app
from app.llm.provider import ExtractiveProvider
from app.services.assistant_summary import concise_answer, health_answer, UNAVAILABLE
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService

ROOT=Path(__file__).resolve().parents[2]

def finding(quote, severity=None):
    return S(quote=quote,evidence_id='e1',severity=severity,owner=None)

def test_highest_severity_ties_keep_documented_actions_and_no_invented_ranking():
    quotes=[f'Delivery risk; Risk ID: R-0{i}; Risk Title: Concern {i}; Severity: {severity}; Mitigation: review checklist {i}.' for i,severity in [(1,'Critical'),(2,'Critical'),(3,'Low')]]
    result=concise_answer('risks','What is the highest risk?',list(map(finding,quotes)),[])
    assert 'Critical' in result and 'tie' in result and 'Concern 1' in result and 'Concern 2' in result
    assert 'Concern 3' not in result and 'review checklist' in result
    assert 2 <= len(result.splitlines()) <= 5

def test_missing_or_conflicting_severity_never_becomes_a_rank():
    quotes=['Risk ID: R-01; Risk Title: Access risk; Severity: High.', 'Risk ID: R-01; Risk Title: Access risk; Severity: Low.']
    result=concise_answer('risks','Highest risk?',list(map(finding,quotes)),[])
    assert 'Not established' in result
    assert UNAVAILABLE in concise_answer('risks','Highest risk?',[finding('Access is blocked.')],[])

def test_default_blockers_are_short_with_only_documented_owner_and_action():
    quotes=[f'Blocker B-{i}: workspace {i} is unavailable; Owner: Ravi Kumar; Next action: restore access.' for i in range(5)]
    answer=concise_answer('blockers','Current blockers?',list(map(finding,quotes)),[])
    assert len(answer.splitlines())==4
    assert 'B-3' not in answer and 'Ravi Kumar' in answer and 'restore access' in answer
    assert 'Deadline' not in answer
    detailed=concise_answer('blockers','Current blockers in detail?',list(map(finding,quotes)),[])
    assert 'B-4' in detailed

def test_unknown_health_is_never_zero():
    assert health_answer(S(overall_score=None))==UNAVAILABLE

@pytest.fixture(scope='module')
def embeddings():return WordLlamaEmbeddings()

def test_incremental_note_retrieval_answers_deduplication_exports_and_isolation(tmp_path,embeddings):
    kb=KnowledgeBaseService(tmp_path,embeddings)
    with TestClient(create_app(kb,ExtractiveProvider())) as c:
        for p in sorted((ROOT/'sample_documents').glob('*')):
            if p.suffix in ('.pdf','.docx','.csv','.txt'):
                r=c.post('/api/documents/upload',files={'files':(p.name,p.read_bytes())})
                assert r.status_code==200 and r.json()['documents'][0]['indexed']
        initial=c.get('/api/knowledge-base').json()
        assert initial['indexed_documents']==6
        question='Which tasks are blocked by the export font?'
        before=c.post('/api/assistant/query',json={'question':question}).json()
        assert before['answer']==UNAVAILABLE
        for q in ['What is the highest risk in my project?','What is the overall health score?','What are the current blockers?']:
            result=c.post('/api/assistant/query',json={'question':q}).json()
            assert result['status'] in ('ok','partial'),result
            assert 2 <= len(result['answer'].splitlines()) <= 5
            if 'highest' in q: assert 'Critical' in result['answer']
            if 'health' in q:
                score=c.post('/api/project-health/assess',json={}).json()['overall_score']
                assert f'{score}/100' in result['answer']
        state=c.get('/api/workspaces/legacy/state').json()
        note=ROOT/'sample_meeting_notes/AI_Project_Meeting_Notes_03_Export_Readiness_Update.docx'
        r=c.post('/api/documents/upload',files={'files':(note.name,note.read_bytes())})
        assert r.status_code==200 and r.json()['documents'][0]['indexed']
        added=r.json()['documents'][0]
        changed=c.get('/api/workspaces/legacy/state').json()
        assert changed['source_version']!=state['source_version']
        assert all(r['source_version']!=changed['source_version'] for r in changed['results'])
        answer=c.post('/api/assistant/query',json={'question':question}).json()
        assert 'export font' in answer['answer'].lower() and 'Arjun Das' in answer['answer']
        assert any(e['filename']==note.name for e in answer['evidence'])
        for s in answer['statements']:
            e=next(e for e in answer['evidence'] if e['id']==s['reference']['evidence_id'])
            assert s['reference']['quote'] in e['text']
        retrieval=c.post('/api/retrieval/query',json={'query':'export font checklist blocker','top_k':5}).json()
        assert any(e['filename']==note.name for e in retrieval['results'])
        for path in ('agents/scope','agents/risk','agents/blockers','documentation/generate','project-health/assess'):
            r=c.post('/api/'+path,json={});assert r.status_code==200,r.text
            if path=='agents/blockers':assert any('B-03' in f['quote'] for f in r.json()['findings'])
            if path=='documentation/generate':assert any('T-19' in a['description'] for a in r.json()['action_items'])
        indexed=c.get('/api/knowledge-base').json()
        again=c.post('/api/documents/upload',files={'files':('renamed.docx',note.read_bytes())}).json()['documents'][0]
        assert again['id']==added['id']
        assert c.get('/api/knowledge-base').json()['chunk_count']==indexed['chunk_count']
        assert c.get('/api/knowledge-base').json()['document_count']==7
        for fmt in ('pdf','docx'):
            r=c.get('/api/workspaces/legacy/export',params={'format':fmt})
            assert r.status_code==200,r.text
            text=('\n'.join(p.extract_text() for p in PdfReader(BytesIO(r.content)).pages) if fmt=='pdf' else '\n'.join(p.text for p in Document(BytesIO(r.content)).paragraphs))
            assert 'B-03' in text and 'Arjun Das' in text
        other=c.post('/api/workspaces',json={'name':'Isolated demo'}).json()['id'];headers={'X-Workspace-ID':other}
        assert c.get('/api/knowledge-base',headers=headers).json()['document_count']==0
        assert c.post('/api/assistant/query',headers=headers,json={'question':question}).json()['answer']==UNAVAILABLE
        distinct=c.post('/api/documents/upload',headers=headers,files={'files':(note.name,note.read_bytes())}).json()['documents'][0]
        assert distinct['id']!=added['id']
        assert c.get('/api/knowledge-base').json()['document_count']==7
    # The digest is persisted and does not depend on session memory.
    reopened=KnowledgeBaseService(tmp_path,embeddings)
    assert reopened.ingest(note.name,note.read_bytes())['id']==added['id']
