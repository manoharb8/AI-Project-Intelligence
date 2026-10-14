"""Real ingestion/retrieval/API check: new aliases stay source-grounded across formats."""
import csv
from io import BytesIO, StringIO
from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from fastapi.testclient import TestClient
from app.main import create_app
from app.llm.provider import ExtractiveProvider
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService


def test_probability_alias_and_adjacent_ratings_through_all_four_formats(tmp_path):
    kb=KnowledgeBaseService(tmp_path, WordLlamaEmbeddings())
    for kind in ('pdf','docx','txt','csv'):
        description=f'Schedule risk: the {kind.upper()} integration is delayed.'
        text=description+' Probability: 70%. Impact: High. Severity: Critical.'
        if kind=='pdf':
            stream=BytesIO();SimpleDocTemplate(stream,pagesize=A4).build([Paragraph(text,getSampleStyleSheet()['BodyText'])]);data=stream.getvalue()
        elif kind=='docx':
            document=Document();document.add_paragraph(text);stream=BytesIO();document.save(stream);data=stream.getvalue()
        elif kind=='csv':
            stream=StringIO();writer=csv.writer(stream);writer.writerow(['Description','Owner','Probability','Impact','Severity']);writer.writerow([description,'Not stated','70%','High','Critical']);data=stream.getvalue().encode()
        else:data=text.encode()
        assert kb.ingest(f'validation.{kind}',data)['indexed']
    with TestClient(create_app(kb, ExtractiveProvider())) as client:
        health_before=client.post('/api/project-health/assess',json={}).json()
        risk_before=client.post('/api/agents/risk',json={}).json()
        response=client.post('/api/documentation/generate',json={})
        assert response.status_code==200,response.text
        result=response.json()
        indexed={e['id']:e for e in result['evidence']}
        assert {indexed[r['references'][0]['evidence_id']]['document_type'] for r in result['risks']}=={'pdf','docx','txt','csv'}
        for risk in result['risks']:
            assert (risk['likelihood'],risk['impact'],risk['severity'])==('70%','High','Critical')
            for ref in risk['references']:
                assert ref['quote'] in indexed[ref['evidence_id']]['text']
            for value in ('70%','High','Critical'):
                assert any(value in ref['quote'] for ref in risk['references'])
        health_after=client.post('/api/project-health/assess',json={}).json()
        risk_after=client.post('/api/agents/risk',json={}).json()
        assert health_before['overall_score']==health_after['overall_score']
        assert health_before['dimensions']==health_after['dimensions']
        assert risk_before['findings']==risk_after['findings']
