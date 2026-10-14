"""The shipped six-document scenario runs through real WordLlama and ChromaDB."""
import csv
import re
from pathlib import Path
from docx import Document
from fastapi.testclient import TestClient
from app.main import create_app
from app.llm.provider import ExtractiveProvider
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService

SAMPLES=Path(__file__).resolve().parents[2]/'sample_documents'
EXPECTED=[
 ('R-01','High','High','Critical','Neha Rao','2026-10-10','T-07'),
 ('R-02','Low','Critical','Critical','Ravi Kumar','2026-10-09','T-08'),
 ('R-03','Moderate','High','High','Meera Shah','2026-10-10','T-09'),
 ('R-04','High','Moderate','High','Arjun Das','2026-10-12','T-10'),
 ('R-05','Medium','Moderate','Moderate','Neha Rao','2026-10-13','T-11'),
 ('R-06','Moderate','Moderate','Moderate','Ravi Kumar','2026-10-13','T-12'),
 ('R-07','Low','High','Moderate','Arjun Das','2026-10-14','T-13'),
 ('R-08','Low','Low','Low','Arjun Das','2026-10-15','T-14'),
 ('R-09','Moderate','High','High','Meera Shah','2026-10-14','T-15'),
]

def test_demo_risk_metadata_matches_register_progress_and_task_ownership():
    register='\n'.join(p.text for p in Document(SAMPLES/'AI_Project_Risk_Register.docx').paragraphs)
    progress=(SAMPLES/'AI_Project_Sprint_Update.txt').read_text()
    with (SAMPLES/'AI_Project_Task_List.csv').open(newline='') as stream:
        rows=list(csv.DictReader(stream))
    tasks={row['Task ID']:row for row in rows}
    assert len(tasks)==18
    for rid,probability,impact,severity,owner,due,task in EXPECTED:
        for text in (register,progress):
            assert f'Risk ID: {rid};' in text
            assert f'Probability: {probability}; Impact: {impact}; Severity: {severity}; Status: Open; Due date: {due};' in text
        assert tasks[task]['Owner']==owner
        assert tasks[task]['Due date']==due
        assert tasks[task]['Linked Risk ID']==rid
        assert tasks[task]['Project']=='AI Project Intelligence & Risk Advisor'


def test_default_demo_preserves_all_nine_named_risks_and_unknowns(tmp_path):
    kb=KnowledgeBaseService(tmp_path,WordLlamaEmbeddings())
    files=sorted(p for p in SAMPLES.iterdir() if p.suffix!='.md')
    assert len(files)==6
    for path in files:
        assert kb.ingest(path.name,path.read_bytes())['indexed']
    with TestClient(create_app(kb,ExtractiveProvider())) as client:
        response=client.post('/api/documentation/generate',json={})
        assert response.status_code==200,response.text
        result=response.json()
        kb_state=client.get('/api/knowledge-base').json()
        assert kb_state['document_count']==kb_state['indexed_documents']==6
    named={}
    evidence={e['id']:e for e in result['evidence']}
    for risk in result['risks']:
        for reference in risk['references']:
            assert reference['quote'] in evidence[reference['evidence_id']]['text']
        ids=re.findall(r'Risk ID: (R-\d+);',risk['description'])
        if len(ids)==1:named[ids[0]]=risk
    assert set(named)=={r[0] for r in EXPECTED}
    for rid,probability,impact,severity,owner,due,_ in EXPECTED:
        risk=named[rid]
        assert (risk['likelihood'],risk['impact'],risk['severity'],risk['status'])==(probability,impact,severity,'Open')
        assert f'Owner: {owner};' in risk['references'][0]['quote']
        assert f'Due date: {due};' in risk['references'][0]['quote']
    # Additional delivery observations stay genuine unknowns, never fake nodes.
    unknown=[r for r in result['risks'] if not re.search(r'Risk ID: R-\d+;',r['description'])]
    assert unknown and all(r['likelihood'] is None and r['impact'] is None for r in unknown)
    assert result['user_stories'] and result['action_items']
