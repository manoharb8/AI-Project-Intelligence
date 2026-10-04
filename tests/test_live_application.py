"""Real-server integration: API evidence and unknowns survive the Vite proxy."""
import pytest
from scripts.smoke_demo import run_demo


@pytest.mark.live
def test_live_application():
    report = run_demo()
    assert report['summary']['indexed_documents'] == 4
    assert report['summary']['chunk_count'] == 17
    assert len(report['agents']) == 3
    for result in report['agents']:
        evidence_by_id = {e['id']: e for e in result['evidence']}
        for finding in result['findings']:
            evidence = evidence_by_id[finding['evidence_id']]
            assert evidence['document_id']
            assert evidence['filename']
            assert evidence['location']
            assert finding['quote'] in evidence['text']
    actions = report['agents'][2]['findings']
    retention = [f for f in actions if f['category'] == 'action_items' and 'retention' in f['quote'].lower()]
    assert retention, 'The sample includes a retention action without an assigned owner or deadline.'
    assert all(f['owner'] is None and f['due_date'] is None for f in retention)
