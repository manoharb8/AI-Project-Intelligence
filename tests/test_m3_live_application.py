import pytest
from scripts.smoke_m3 import run_demo


@pytest.mark.live
def test_m3_through_live_frontend_proxy_and_backend():
    report = run_demo()
    assert report['runtime'] == 'extractive'
    assert report['empty_health']['overall_score'] is None
    assert len(report['assistant']) == 10
