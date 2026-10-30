"""Live check of Flowchart Analysis against a RUNNING backend, using your real model configuration.

    python scripts/verify_flowchart.py                       # sample PNG, Current project workspace
    python scripts/verify_flowchart.py path\\to\\diagram.png   # your own file (PNG/JPEG/WebP/PDF)

Prints what the model read (steps, arrows) and the prioritised risks so you can compare with the diagram.
Exit code 0 only if an analysis was produced.
"""
import sys
from pathlib import Path
import httpx

BASE = 'http://127.0.0.1:8000'
sample = Path(__file__).resolve().parents[1] / 'sample_flowcharts' / 'order_flow.png'
path = Path(sys.argv[1]) if len(sys.argv) > 1 else sample
status = httpx.get(f'{BASE}/api/flowcharts/status', timeout=10).json()
print(f"Vision model: {status['provider']} / {status['model']}  ready={status['ready']}")
if not status['ready']:
    sys.exit('NOT READY: ' + status['message'])
print(f'Analysing {path.name} (this can take up to a minute)...')
response = httpx.post(f'{BASE}/api/flowcharts/analyze', files={'file': (path.name, path.read_bytes())}, timeout=300)
if response.status_code != 200:
    sys.exit(f'FAILED (HTTP {response.status_code}): {response.json().get("detail", response.text)}')
for a in response.json()['analyses']:
    print(f"\n=== {a['title'] or a['filename']}  (page {a['page'] or 1}, legibility: {a['legibility']})")
    print('Purpose:', a['purpose'])
    print(f"\nSteps read ({len(a['nodes'])}):")
    for n in a['nodes']:
        print(f"  {n['id']:>4}  [{n['type']}] {n['label']}")
    print(f"\nArrows read ({len(a['edges'])}):")
    for e in a['edges']:
        print(f"  {e['source']} -> {e['target']}  {e['label']}")
    print('\nRisks:')
    for r in a['risks']:
        print(f"  [{r['priority']}] ({r['basis']}, {r['origin']}) {r['title']}  evidence={r['evidence_nodes']}")
        print(f"      why: {r['priority_reason']}\n      fix: {r['mitigation']}")
    for u in a['uncertainties']:
        print('  uncertain:', u)
print('\nCompare the steps and arrows above with the diagram. For the bundled sample the correct reading is 8 steps,')
print('a "Payment valid?" decision with only a Yes branch, and "Retry upload" looping onto itself.')
