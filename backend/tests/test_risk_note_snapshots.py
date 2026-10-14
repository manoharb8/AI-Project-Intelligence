from types import SimpleNamespace as S
from app.agents.risk_ratings import extract_risk_ratings
from app.agents.risk_history import current_risk_findings
from app.services.assistant_summary import concise_answer


def finding(status='Open',severity='Critical',date='2026-10-08'):
    return S(quote=f'Risk ID: R-02; Risk Title: Workspace data mixing; Risk Description: Delivery challenge; Probability: 4/5 — High; Impact: 5/5 — Very High; Severity: {severity}; Status: {status}; Owner: Ravi Kumar; Mitigation: Complete isolation checks; As of: {date}.',evidence_id='e',severity=severity)


def test_literal_fraction_ratings_keep_their_scale():
    f=finding();r=extract_risk_ratings(f.quote,f.quote)
    assert r.values=={'likelihood':'4/5 — High','impact':'5/5 — Very High','severity':'Critical'}
    assert not r.conflicts


def test_latest_explicit_snapshot_wins_in_either_input_order():
    old=finding(date='2026-10-05');new=finding(status='In Progress')
    for entries in ([old,new],[new,old]):assert current_risk_findings(entries)==[new]


def test_undated_invalid_or_same_day_conflicts_are_not_silently_overridden():
    new=finding();old=finding(severity='Low',date='2026-02-30')
    assert current_risk_findings([old,new])==[old,new]
    same=finding(severity='Low');assert current_risk_findings([same,new])==[same,new]
    assert 'Not established' in concise_answer('risks','Highest risk?',[same,new],[])


def test_latest_resolved_risk_not_reported_as_current_highest():
    old=finding();new=finding(status='Resolved',date='2026-10-09')
    assert 'Not established' in concise_answer('risks','Highest risk?',[old,new],[])


def test_three_corrected_notes_real_upload_refresh_and_chat(tmp_path):
    from pathlib import Path
    from fastapi.testclient import TestClient
    from app.main import create_app
    from app.llm.provider import ExtractiveProvider
    from app.services.embeddings import WordLlamaEmbeddings
    from app.services.knowledge_base import KnowledgeBaseService
    import re
    notes=sorted((Path(__file__).resolve().parents[2]/'sample_meeting_notes_corrected').glob('*.docx'))
    assert len(notes)==3
    with TestClient(create_app(KnowledgeBaseService(tmp_path,WordLlamaEmbeddings()),ExtractiveProvider())) as client:
        for note in notes:
            response=client.post('/api/documents/upload',files={'files':(note.name,note.read_bytes())})
            assert response.status_code==200
            assert response.json()['documents'][0]['indexed']
        assert client.get('/api/knowledge-base').json()['indexed_documents']==3
        for _ in range(2):
            response=client.post('/api/documentation/generate',json={})
            assert response.status_code==200
            result=response.json();groups={}
            for risk in result['risks']:
                ids=re.findall(r'Risk ID: (R-\d+)',risk['description'])
                if ids:groups.setdefault(ids[0],[]).append(risk)
            assert sorted(groups)==['R-01','R-02','R-03','R-04','R-05']
            for records in groups.values():
                assert len(records)==3
                assert all(r['likelihood'] and r['impact'] and r['severity'] for r in records)
                assert any('As of: 2026-10-08' in r['description'] for r in records)
                for r in records:
                    for ref in r['references']:
                        e=next(e for e in result['evidence'] if e['id']==ref['evidence_id'])
                        assert ref['quote'] in e['text']
            assert all(r['likelihood']=='4/5 — High' and r['impact']=='5/5 — Very High' for r in groups['R-02'])
            response=client.post('/api/assistant/query',json={'question':'What is the highest risk in my project?'})
            assert response.status_code==200
            assert 'R-02: Workspace data mixing' in response.json()['answer']
            assert 'Critical' in response.json()['answer']
        before=client.get('/api/knowledge-base').json()
        client.post('/api/documents/upload',files={'files':(notes[2].name,notes[2].read_bytes())})
        after=client.get('/api/knowledge-base').json()
        assert (before['document_count'],before['chunk_count'])==(after['document_count'],after['chunk_count'])
