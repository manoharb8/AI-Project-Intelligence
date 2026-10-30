"""Exercise M1 -> M2 -> M3 through real FastAPI and Vite servers.

Uses a temporary knowledge base and existing samples. No API key is required.
Run from the project root: python scripts/smoke_m3.py --output path/to/report.json
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import httpx

ROOT = Path(__file__).resolve().parents[1]
# Reuse lifecycle cleanup without invoking or changing the historical M2 demo.
sys.path.insert(0, str(ROOT / 'scripts'))
from smoke_demo import stop

QUESTIONS = [
    'Are we on track?', 'What are our biggest risks?', 'Which tasks are blocked?',
    'What are our current deliverables?', 'Who has pending action items?',
    'What dependencies are causing delays?', 'What is the current project health?',
    'What needs attention?', 'What is the approved project budget?',
    'How do I bake a chocolate cake?',
]


def validate_references(result):
    references = [r for group in ('user_stories', 'risks', 'action_items') for item in result.get(group, []) for r in item['references']]
    references += [r for d in result.get('dimensions', []) for r in d['references']]
    references += [s['reference'] for s in result.get('statements', [])]
    evidence = {e['id']: e for e in result['evidence']}
    for ref in references:
        assert ref['evidence_id'] in evidence, ref
        assert ref['quote'] in evidence[ref['evidence_id']]['text'], ref
    if result.get('health'):
        validate_references(result['health'])


def run_demo(output=None):
    for port in (8000, 5173):
        with socket.socket() as check:
            # Allow sequential smoke runs after TCP TIME_WAIT; a live listener
            # still fails this check. This does not request SO_REUSEPORT.
            if os.name == 'posix':
                check.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            check.bind(('127.0.0.1', port))
    node = shutil.which('node')
    vite = ROOT / 'frontend/node_modules/vite/bin/vite.js'
    if not node or not vite.is_file():
        raise RuntimeError('Install Node.js and run npm ci in frontend first.')
    processes = []
    with tempfile.TemporaryDirectory(prefix='project-intelligence-m3-') as temp:
        env = dict(os.environ, DATA_DIR=str(Path(temp)/'data'), LLM_PROVIDER='extractive')
        log_path = Path(temp)/'servers.log'
        with log_path.open('w') as log:
            try:
                processes.append(subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], cwd=ROOT/'backend', env=env, stdout=log, stderr=log, start_new_session=os.name == 'posix'))
                processes.append(subprocess.Popen([node, str(vite), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], cwd=ROOT/'frontend', env=env, stdout=log, stderr=log, start_new_session=os.name == 'posix'))
                with httpx.Client(base_url='http://127.0.0.1:5173', timeout=90, trust_env=False) as client:
                    for _ in range(200):
                        if any(p.poll() is not None for p in processes):
                            raise RuntimeError('A server exited during startup.')
                        try:
                            if client.get('/api/health').status_code == 200:
                                break
                        except httpx.HTTPError:
                            pass
                        time.sleep(.2)
                    else:
                        raise RuntimeError('Servers did not become ready.')
                    report = {'verified_at':datetime.now(timezone.utc).isoformat(), 'runtime':'extractive', 'routes':{}}
                    for route in ['/dashboard', '/documents', '/knowledge-base', '/retrieval', '/scope', '/risks', '/blockers', '/documentation', '/project-health', '/assistant']:
                        response = client.get(route)
                        assert response.status_code == 200 and 'text/html' in response.headers['content-type']
                        report['routes'][route] = response.status_code
                    def post(path, payload):
                        response = client.post(path, json=payload)
                        assert response.status_code == 200, response.text
                        return response.json()
                    report['empty_health'] = post('/api/project-health/assess', {})
                    assert report['empty_health']['overall_score'] is None
                    files = [('files', (p.name,p.read_bytes())) for p in sorted((ROOT/'samples').iterdir()) if p.is_file()]
                    response = client.post('/api/documents/upload', files=files)
                    assert response.status_code == 200, response.text
                    report['upload'] = response.json()
                    assert len(report['upload']['documents']) == 4 and all(d['indexed'] for d in report['upload']['documents'])
                    report['summary'] = client.get('/api/knowledge-base').json()
                    assert report['summary']['indexed_documents'] == 4 and report['summary']['chunk_count'] == 17
                    report['agent_status'] = client.get('/api/agents/status').json()
                    report['queries'] = [post('/api/retrieval/query', {'query':'What are the current project risks?'})]
                    assert report['queries'][0]['results']
                    report['agents'] = [post('/api/agents/'+kind, {'query':'Review the uploaded project documents.'}) for kind in ['scope', 'risk', 'blockers']]
                    assert all(r['findings'] for r in report['agents'])
                    report['documentation'] = post('/api/documentation/generate', {})
                    doc = report['documentation']
                    assert doc['user_stories'] and doc['risks'] and doc['action_items']
                    assert {e['document_type'] for e in doc['evidence']} == {'pdf', 'docx', 'csv', 'txt'}
                    unknown = next(a for a in doc['action_items'] if 'retention-policy' in a['description'])
                    assert unknown['owner'] is None and unknown['due_date'] is None
                    validate_references(doc)
                    report['health'] = post('/api/project-health/assess', {})
                    health = report['health']
                    assert health['overall_score'] is not None and health['assessed_dimensions'] == 3
                    expected = int(sum(d['weight']*d['health_contribution'] for d in health['dimensions'])/100+.5)
                    assert health['overall_score'] == expected
                    validate_references(health)
                    report['assistant'] = [post('/api/assistant/query', {'question':q}) for q in QUESTIONS]
                    for result in report['assistant']:
                        validate_references(result)
                    assert all(r['grounding'] != 'insufficient_evidence' for r in report['assistant'][:8])
                    assert all(r['grounding'] == 'insufficient_evidence' for r in report['assistant'][8:])
                    assert report['assistant'][6]['health']['overall_score'] == health['overall_score']
                    assert client.post('/api/assistant/query', json={'question':' '}).status_code == 422
                    if output:
                        Path(output).parent.mkdir(parents=True, exist_ok=True)
                        Path(output).write_text(json.dumps(report, indent=2), encoding='utf-8')
                    print(json.dumps({'routes':len(report['routes']), 'documents':4, 'passages':17,
                        'user_stories':len(doc['user_stories']), 'risk_register_entries':len(doc['risks']), 'action_items':len(doc['action_items']),
                        'overall_evidence_health':health['overall_score'], 'assistant_questions':len(QUESTIONS), 'result':'passed'}, indent=2))
                    return report
            except Exception:
                print(log_path.read_text(), file=sys.stderr)
                raise
            finally:
                for process in reversed(processes):
                    stop(process)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Optional JSON evidence report; no database or credentials are exported.')
    run_demo(parser.parse_args().output)
