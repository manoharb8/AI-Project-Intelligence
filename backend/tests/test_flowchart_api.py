"""Real HTTP stack + real workspace folders + real fixture files. The model is scripted."""
import pytest
from fastapi.testclient import TestClient
from app.flowchart.provider import UnavailableVisionProvider, VisionOutputError
from app.llm.base import ProviderError
from app.llm.provider import ExtractiveProvider
from app.main import create_app
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService
from flowchart_support import ORDER_FLOW, ScriptedVision, fixture


@pytest.fixture(scope='module')
def embeddings():
    return WordLlamaEmbeddings()


def make(tmp_path, embeddings, vision):
    kb = KnowledgeBaseService(tmp_path, embeddings)
    return TestClient(create_app(kb, ExtractiveProvider(), vision))


def post(client, name, data=None, headers=None, mime='application/octet-stream'):
    return client.post('/api/flowcharts/analyze', files={'file': (name, data if data is not None else fixture(name), mime)}, headers=headers or {})


def test_png_upload_is_analysed_saved_and_displayable(tmp_path, embeddings):
    vision = ScriptedVision(ORDER_FLOW)
    with make(tmp_path, embeddings, vision) as c:
        r = post(c, 'order_flow.png')
        assert r.status_code == 200, r.text
        a = r.json()['analyses'][0]
        assert a['filename'] == 'order_flow.png' and a['source_type'] == 'png' and a['node_count'] == 8
        assert [x['id'] for x in a['nodes']] == [f'N{i}' for i in range(1, 9)] and len(a['edges']) == 8
        assert a['risks'][0]['priority'] == 'Critical' and a['risks'][0]['basis'] == 'observed'
        assert a['risk_summary']['observed'] >= 2 and a['image_data_url'].startswith('data:image/png;base64,')
        inferred = [x for x in a['risks'] if x['basis'] == 'inferred']
        assert inferred and all(x['priority'] in ('Medium', 'Low') and x['assumption'] for x in inferred)
        assert any(x['title'] == 'Loop with no exit' for x in a['risks'])  # added by code, not the model
        assert vision.calls[0]['media_type'] == 'image/png' and vision.calls[0]['project_type'] == 'code'
        listing = c.get('/api/flowcharts').json()
        assert len(listing) == 1 and listing[0]['id'] == a['id'] and 'nodes' not in listing[0]
        again = c.get(f"/api/flowcharts/{a['id']}").json()
        assert again['image_data_url'] == a['image_data_url'] and again['nodes'] == a['nodes']


def test_transparent_png_reaches_the_model_on_a_white_background(tmp_path, embeddings):
    import io
    from PIL import Image, ImageStat
    vision = ScriptedVision(ORDER_FLOW)
    with make(tmp_path, embeddings, vision) as c:
        r = post(c, 'order_flow_transparent.png')
        assert r.status_code == 200 and any('Transparent' in n for n in r.json()['notes'])
    sent = Image.open(io.BytesIO(vision.calls[0]['data']))
    assert sent.mode == 'RGB' and ImageStat.Stat(sent.convert('L')).mean[0] > 230


def test_pdf_pages_are_rasterised_and_analysed(tmp_path, embeddings):
    vision = ScriptedVision(ORDER_FLOW)
    with make(tmp_path, embeddings, vision) as c:
        r = post(c, 'order_flow.pdf')
        assert r.status_code == 200, r.text
        a = r.json()['analyses'][0]
        assert a['source_type'] == 'pdf' and a['page'] == 1 and a['page_count'] == 1 and a['node_count'] == 8
        assert vision.calls[0]['page'] == 1 and vision.calls[0]['media_type'] == 'image/png'


def test_extension_is_ignored_content_decides(tmp_path, embeddings):
    with make(tmp_path, embeddings, ScriptedVision(ORDER_FLOW)) as c:
        assert post(c, 'diagram.jpg', fixture('order_flow.png')).status_code == 200
        r = post(c, 'real.png', fixture('fake.png'))
        assert r.status_code == 422 and 'not a supported image or PDF' in r.json()['detail']


@pytest.mark.parametrize('name,status,fragment', [('blank.png', 422, 'blank'), ('corrupt.png', 422, 'could not be read'),
                                                  ('fake.png', 422, 'supported')])
def test_bad_uploads_never_reach_the_model_and_explain_why(tmp_path, embeddings, name, status, fragment):
    vision = ScriptedVision(ORDER_FLOW)
    with make(tmp_path, embeddings, vision) as c:
        r = post(c, name)
        assert r.status_code == status and fragment in r.json()['detail']
        assert vision.calls == [] and c.get('/api/flowcharts').json() == []


def test_empty_file_and_oversize(tmp_path, embeddings):
    with make(tmp_path, embeddings, ScriptedVision(ORDER_FLOW)) as c:
        assert post(c, 'a.png', b'').status_code == 422
        assert post(c, 'big.png', b'\x89PNG\r\n\x1a\n' + b'0' * (10 * 1024 * 1024 + 5)).status_code == 413


def test_model_says_not_a_flowchart(tmp_path, embeddings):
    answer = {'is_flowchart': False, 'not_flowchart_reason': 'It is a page of text notes.', 'nodes': [], 'edges': [], 'risks': []}
    with make(tmp_path, embeddings, ScriptedVision(answer)) as c:
        r = post(c, 'not_a_flowchart.png')
        assert r.status_code == 422 and 'No flowchart was found' in r.json()['detail'] and 'text notes' in r.json()['detail']
        assert c.get('/api/flowcharts').json() == []


def test_unreadable_diagram_is_reported_not_invented(tmp_path, embeddings):
    answer = {'is_flowchart': True, 'legibility': 'poor', 'image_issues': ['Text is too blurry.'], 'purpose': '', 'nodes': [], 'edges': [], 'risks': []}
    with make(tmp_path, embeddings, ScriptedVision(answer)) as c:
        r = post(c, 'order_flow.png')
        assert r.status_code == 422 and 'blurry' in r.json()['detail']


def test_provider_failures_surface_as_503_with_a_message(tmp_path, embeddings):
    with make(tmp_path, embeddings, ScriptedVision(ProviderError('The Anthropic API rate limit or quota was reached.'))) as c:
        r = post(c, 'order_flow.png')
        assert r.status_code == 503 and 'rate limit' in r.json()['detail'] and c.get('/api/flowcharts').json() == []


def test_unusable_model_output_is_retried_once_with_feedback(tmp_path, embeddings):
    vision = ScriptedVision(VisionOutputError('"nodes" and "edges" must be lists.'), ORDER_FLOW)
    with make(tmp_path, embeddings, vision) as c:
        assert post(c, 'order_flow.png').status_code == 200
    assert len(vision.calls) == 2 and vision.calls[0]['feedback'] is None and 'must be lists' in vision.calls[1]['feedback']
    hopeless = ScriptedVision(VisionOutputError('bad'))
    with make(tmp_path / 'x', embeddings, hopeless) as c:
        r = post(c, 'order_flow.png')
        assert r.status_code == 502 and 'retry' in r.json()['detail'] and len(hopeless.calls) == 2


def test_status_and_unconfigured_provider_gives_setup_instructions(tmp_path, embeddings):
    with make(tmp_path, embeddings, UnavailableVisionProvider('Set GROQ_API_KEY.')) as c:
        s = c.get('/api/flowcharts/status').json()
        assert s['ready'] is False and s['mode'] == 'unavailable' and 'png' in s['accepted_formats']
        r = post(c, 'order_flow.png')
        assert r.status_code == 503 and 'GROQ_API_KEY' in r.json()['detail']
    with make(tmp_path / 'ok', embeddings, ScriptedVision(ORDER_FLOW)) as c:
        s = c.get('/api/flowcharts/status').json()
        assert s['ready'] and s['model'] == 'test-model'


def test_workspaces_are_isolated_typed_and_deleted_with_their_flowcharts(tmp_path, embeddings):
    vision = ScriptedVision(ORDER_FLOW)
    with make(tmp_path, embeddings, vision) as c:
        ws = c.post('/api/workspaces', json={'name': 'Design system', 'project_type': 'uiux'}).json()
        h = {'X-Workspace-ID': ws['id']}
        assert post(c, 'order_flow.png', headers=h).status_code == 200
        assert vision.calls[0]['project_type'] == 'uiux'          # the workspace type reaches the analysis
        assert len(c.get('/api/flowcharts', headers=h).json()) == 1
        assert c.get('/api/flowcharts').json() == []              # legacy workspace sees nothing
        ident = c.get('/api/flowcharts', headers=h).json()[0]['id']
        assert c.get(f'/api/flowcharts/{ident}').status_code == 404
        assert c.delete(f'/api/flowcharts/{ident}', headers=h).status_code == 200
        assert c.get(f'/api/flowcharts/{ident}', headers=h).status_code == 404
        assert c.get('/api/flowcharts/../../etc/passwd', headers=h).status_code in (404, 422)
        post(c, 'order_flow.png', headers=h)
        folder = tmp_path / 'workspaces' / ws['id'] / 'flowcharts'
        assert any(folder.glob('*.json'))
        assert c.delete(f"/api/workspaces/{ws['id']}").status_code == 200
        assert not (tmp_path / 'workspaces' / ws['id']).exists()
        assert c.get('/api/flowcharts', headers=h).status_code == 404


def test_saved_analysis_survives_a_restart(tmp_path, embeddings):
    with make(tmp_path, embeddings, ScriptedVision(ORDER_FLOW)) as c:
        ident = post(c, 'order_flow.png').json()['analyses'][0]['id']
    with make(tmp_path, embeddings, ScriptedVision(ORDER_FLOW)) as c:
        assert c.get(f'/api/flowcharts/{ident}').json()['node_count'] == 8
