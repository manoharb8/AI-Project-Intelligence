"""Runs real WordLlama and persistent Chroma; no fake retrieval pass claims."""
import json
import os
from pathlib import Path
import subprocess
import sys
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService
from app.core.config import COLLECTION_NAME

SAMPLES=Path(__file__).resolve().parents[2]/'samples'
pytestmark=pytest.mark.integration

@pytest.fixture(scope='session')
def embeddings():return WordLlamaEmbeddings()

@pytest.fixture
def service(tmp_path,embeddings):return KnowledgeBaseService(tmp_path,embeddings)

@pytest.fixture
def populated(service):
    for p in sorted(SAMPLES.iterdir()):
        if p.suffix in ('.pdf','.docx','.csv','.txt'):
            record=service.ingest(p.name,p.read_bytes())
            assert record['indexed'],record
    return service

@pytest.fixture
def client(service):
    with TestClient(create_app(service)) as c:yield c

def test_real_embeddings_shape_consistency_and_similarity(embeddings):
    texts=['API development deadline','API implementation schedule','galaxies and black holes']
    a=np.array(embeddings.embed(texts));b=np.array(embeddings.embed(texts))
    assert a.shape==(3,256)
    assert np.allclose(a,b,atol=1e-6)
    assert np.allclose(np.linalg.norm(a,axis=1),1,atol=1e-5)
    assert a[0]@a[1]>a[0]@a[2]

@pytest.mark.parametrize('query,expected',[
 ('Who is responsible for the API work?','Priya'),
 ('What milestones are defined?','September'),
 ('What are the major project blockers?','staging'),
 ('What are the current project risks?','risks'),
 ('Which tasks are incomplete?','Incomplete')])
def test_semantic_retrieval_with_sources(populated,query,expected):
    result=populated.query(query)
    assert result['status']=='ok',result
    assert any(expected.lower() in r['text'].lower() for r in result['results']),result
    assert all(r['id'] and r['location'] and r['document_id'] and r['filename'] for r in result['results'])
    assert [r['similarity'] for r in result['results']]==sorted([r['similarity'] for r in result['results']],reverse=True)

@pytest.mark.parametrize('query',['How do I bake a chocolate cake?','What is the mass of Jupiter?','Explain photosynthesis in oak leaves.'])
def test_unrelated_queries_return_insufficient(populated,query):
    result=populated.query(query)
    assert result['status']=='insufficient_information',result
    assert result['results']==[]

def test_persistence_in_separate_process(populated):
    code='''import json,sys,chromadb
from chromadb.config import Settings
c=chromadb.PersistentClient(path=sys.argv[1],settings=Settings(anonymized_telemetry=False)).get_collection(sys.argv[2],embedding_function=None)
r=c.get(include=["documents","metadatas"])
print(json.dumps({"count":c.count(),"sources":sorted(set(m["filename"] for m in r["metadatas"]))}))'''
    output=subprocess.check_output([sys.executable,'-c',code,str(populated.data_dir/'chroma'),COLLECTION_NAME],text=True)
    result=json.loads(output)
    assert result['count']==populated.summary()['chunk_count']
    assert len(result['sources'])==4

def test_manifest_reload(populated,embeddings):
    reloaded=KnowledgeBaseService(populated.data_dir,embeddings)
    assert reloaded.summary()==populated.summary()
    assert reloaded.query('Who owns API development?')['results']

def test_empty_knowledge_base(client):
    assert client.get('/api/knowledge-base').json()['indexed_documents']==0
    response=client.post('/api/retrieval/query',json={'query':'project risks'})
    assert response.status_code==200
    assert response.json()['status']=='insufficient_information'

@pytest.mark.parametrize('name',['project_proposal.pdf','meeting_notes.docx','task_list.csv','sprint_update.txt'])
def test_upload_api_formats(client,name):
    response=client.post('/api/documents/upload',files=[('files',(name,(SAMPLES/name).read_bytes()))])
    assert response.status_code==200
    assert response.json()['documents'][0]['indexed']
    assert client.get('/api/documents').json()[0]['filename']==name
    assert client.get('/api/knowledge-base').json()['chunk_count']>0

def test_bad_document_does_not_break_batch(client):
    response=client.post('/api/documents/upload',files=[('files',('broken.pdf',b'not pdf')),('files',('good.txt',b'Priya owns API development.'))])
    assert [d['status'] for d in response.json()['documents']]==['error','indexed']
    assert client.get('/api/knowledge-base').json()['indexed_documents']==1

@pytest.mark.parametrize('body',[{}, {'query':''},{'query':'  '},{'query':'x'},{'query':'project','top_k':0},{'query':'project','top_k':11},{'query':'a'*1001}])
def test_invalid_query(client,body):
    assert client.post('/api/retrieval/query',json=body).status_code==422

def test_malformed_json_and_missing_upload(client):
    assert client.post('/api/retrieval/query',content='{broken',headers={'Content-Type':'application/json'}).status_code==422
    assert client.post('/api/documents/upload').status_code==422

def test_file_size_and_batch_limits(client):
    r=client.post('/api/documents/upload',files=[('files',('big.txt',b'a'*(10*1024*1024+1)))])
    assert r.json()['documents'][0]['status']=='error'
    assert client.post('/api/documents/upload',files=[('files',(f'{i}.txt',b'text')) for i in range(21)]).status_code==422

def test_duplicate_filenames_have_distinct_evidence(service):
    a=service.ingest('notes.txt',b'Priya owns API work.')
    b=service.ingest('notes.txt',b'Meera owns testing.')
    assert a['id']!=b['id']
    assert service.collection.count()==2

def test_interrupted_ingestion_recovers(tmp_path,embeddings):
    kb=KnowledgeBaseService(tmp_path,embeddings)
    kb.documents=[dict(id='interrupted',filename='x.txt',status='processing',indexed=False,chunk_count=0)]
    kb._save()
    kb.collection.add(ids=['interrupted:chunk-1'],embeddings=embeddings.embed(['API work']),documents=['API work'],metadatas=[{'document_id':'interrupted'}])
    loaded=KnowledgeBaseService(tmp_path,embeddings)
    assert loaded.documents[0]['status']=='error'
    assert loaded.collection.count()==0

def test_embedding_failure_rolls_back(service,monkeypatch):
    def fail(texts):raise RuntimeError('internal secret error')
    monkeypatch.setattr(service.embeddings,'embed',fail)
    doc=service.ingest('failed.txt',b'The API project timeline is pending.')
    assert doc['status']=='error'
    assert 'secret' not in doc['error']
    assert service.collection.count()==0

def test_api_failure_is_sanitized(service,monkeypatch):
    def fail(*args):raise RuntimeError('internal secret error')
    monkeypatch.setattr(service,'query',fail)
    with TestClient(create_app(service),raise_server_exceptions=False) as c:
        response=c.post('/api/retrieval/query',json={'query':'API schedule'})
    assert response.status_code==500
    assert 'secret' not in response.text

def test_health(client):
    assert client.get('/api/health').json()['status']=='ready'
