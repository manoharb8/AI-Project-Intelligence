"""Start both real servers, exercise the Vite proxy and APIs, then stop them.
Run from a Python environment containing backend requirements-dev.txt.
"""
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import httpx

ROOT = Path(__file__).resolve().parents[1]

def stop(process):
    if process.poll() is None:
        if os.name == 'posix':
            os.killpg(process.pid, signal.SIGTERM)
        else:
            process.terminate()
        try:process.wait(timeout=10)
        except subprocess.TimeoutExpired:process.kill()


def run_demo():
    # Fail before launching if another app owns either demo port.
    for port in (8000, 5173):
        with socket.socket() as check:
            check.bind(('127.0.0.1', port))
    node = shutil.which('node')
    vite = ROOT / 'frontend' / 'node_modules' / 'vite' / 'bin' / 'vite.js'
    if not node or not vite.is_file():
        raise RuntimeError('Install Node.js and run npm ci in frontend first.')
    processes=[]
    with tempfile.TemporaryDirectory() as temp:
        env=dict(os.environ,DATA_DIR=str(Path(temp)/'data'),LLM_PROVIDER='extractive')
        log_path=Path(temp)/'servers.log'
        with log_path.open('w') as log:
            try:
                processes.append(subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000'],cwd=ROOT/'backend',env=env,stdout=log,stderr=log,start_new_session=os.name=='posix'))
                # Direct Node invocation also works on Windows without npm.cmd shell handling.
                processes.append(subprocess.Popen([node,str(vite),'--host','127.0.0.1','--port','5173','--strictPort'],cwd=ROOT/'frontend',env=env,stdout=log,stderr=log,start_new_session=os.name=='posix'))
                with httpx.Client(base_url='http://127.0.0.1:5173',timeout=60,trust_env=False) as client:
                    for _ in range(200):
                        if any(p.poll() is not None for p in processes):raise RuntimeError('A server exited during startup.')
                        try:
                            if client.get('/api/health').status_code==200:break
                        except httpx.HTTPError:pass
                        time.sleep(.2)
                    else:raise RuntimeError('Servers did not become ready.')
                    report={'routes':{},'queries':[]}
                    for route in ['/dashboard','/documents','/knowledge-base','/retrieval','/scope','/risks','/blockers','/api/health']:
                        response=client.get(route)
                        assert response.status_code==200,(route,response.text)
                        report['routes'][route]=response.status_code
                    samples=sorted((ROOT/'samples').iterdir())
                    response=client.post('/api/documents/upload',files=[('files',(p.name,p.read_bytes())) for p in samples])
                    assert response.status_code==200,response.text
                    report['upload']=response.json()
                    assert len(report['upload']['documents'])==4
                    assert all(d['indexed'] for d in report['upload']['documents'])
                    for q,status in [('Who is responsible for the API work?','ok'),('What milestones are defined?','ok'),('What are the current project risks?','ok'),('How do I bake a chocolate cake?','insufficient_information')]:
                        response=client.post('/api/retrieval/query',json={'query':q})
                        assert response.status_code==200,response.text
                        result=response.json()
                        assert result['status']==status,result
                        report['queries'].append(result)
                    report['agents']=[]
                    report['agent_status']=client.get('/api/agents/status').json()
                    for kind in ['scope','risk','blockers']:
                        focus={'scope':'Review project goals, milestones, timelines, responsibilities, and deliverables.','risk':'Review schedule risks, dependency gaps, delivery challenges, and the stated delivery forecast.','blockers':'Review meeting notes and sprint updates for pending decisions, unresolved issues, and action items.'}[kind]
                        response=client.post('/api/agents/'+kind,json={'query':focus})
                        assert response.status_code==200,response.text
                        result=response.json()
                        assert result['findings'],result
                        assert all(c['count']>0 for c in result['coverage']),result
                        report['agents'].append(result)
                    report['summary']=client.get('/api/knowledge-base').json()
                    (ROOT/'docs'/'milestone2-live-verification.json').write_text(json.dumps(report,indent=2))
                    print(json.dumps({'routes':report['routes'],'indexed_documents':report['summary']['indexed_documents'],'chunks':report['summary']['chunk_count'],'queries':[(r['query'],r['status']) for r in report['queries']],'agents':[(r['agent'],r['status'],len(r['findings'])) for r in report['agents']]},indent=2))
                    return report
            except Exception:
                print(log_path.read_text(),file=sys.stderr)
                raise
            finally:
                for process in reversed(processes):stop(process)

if __name__=='__main__':run_demo()
