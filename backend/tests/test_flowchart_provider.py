import json

import httpx
import pytest

from app.flowchart.imaging import prepare_image
from app.flowchart.provider import VisionOutputError, build_vision_provider
from app.llm.base import ProviderError
from flowchart_support import ORDER_FLOW, fixture

IMAGE = prepare_image(fixture('order_flow.png'))


def groq(handler):
    return build_vision_provider({'VISION_PROVIDER': 'groq', 'GROQ_API_KEY': 'test-groq-key'},
                                 httpx.MockTransport(handler))


def test_groq_request_sends_image_and_parses_json():
    seen = {}
    def handler(request):
        seen['headers'] = request.headers
        seen['body'] = json.loads(request.content)
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(ORDER_FLOW)}}]})
    provider = groq(handler)
    result = provider.analyze(IMAGE, 'uiux')
    assert result['title'] == ORDER_FLOW['title']
    assert seen['headers']['Authorization'] == 'Bearer test-groq-key'
    content = seen['body']['messages'][1]['content']
    assert content[1]['image_url']['url'].startswith('data:image/png;base64,')
    assert seen['body']['max_tokens'] == 8000
    assert provider.status.mode == 'groq'


def test_groq_json_mode_falls_back_once_when_option_is_rejected():
    calls = []
    def handler(request):
        body = json.loads(request.content)
        calls.append('response_format' in body)
        if 'response_format' in body:
            return httpx.Response(400, json={'error': {'message': "unknown field 'response_format'"}})
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(ORDER_FLOW)}}]})
    assert groq(handler).analyze(IMAGE)['title'] == ORDER_FLOW['title']
    assert calls == [True, False]


@pytest.mark.parametrize('status,fragment', [
    (401, 'credentials'), (403, 'credentials'), (404, 'configured model'),
    (413, 'too large'), (429, 'rate limit'), (500, 'temporarily unavailable'),
])
def test_groq_http_errors_are_actionable_and_secret_safe(status, fragment):
    def handler(request):
        return httpx.Response(status, json={'error': {'message': 'private response and test-groq-key'}})
    with pytest.raises(ProviderError) as error:
        groq(handler).analyze(IMAGE)
    assert fragment.lower() in str(error.value).lower()
    assert 'test-groq-key' not in str(error.value) and 'private response' not in str(error.value)


def test_groq_timeout_connection_and_truncation_messages():
    def slow(request):
        raise httpx.ReadTimeout('private timeout', request=request)
    def down(request):
        raise httpx.ConnectError('private connection', request=request)
    with pytest.raises(ProviderError, match='VISION_TIMEOUT_SECONDS'):
        groq(slow).analyze(IMAGE)
    with pytest.raises(ProviderError, match='Could not reach'):
        groq(down).analyze(IMAGE)
    # A syntactically valid API envelope without usable JSON is a bounded output error.
    reply = httpx.Response(200, json={'choices': [{'message': {'content': 'not json'}}]})
    with pytest.raises(VisionOutputError):
        groq(lambda request: reply).analyze(IMAGE)


def test_missing_groq_key_and_non_groq_provider_choices_are_rejected():
    missing = build_vision_provider({'VISION_PROVIDER': 'groq'})
    assert not missing.status.ready and 'GROQ_API_KEY' in missing.status.message
    for choice in ('anthropic', 'openai_compatible', 'gemini', 'openrouter', 'unknown'):
        provider = build_vision_provider({'VISION_PROVIDER': choice, 'GROQ_API_KEY': 'unused'})
        assert not provider.status.ready
        assert 'Only Groq' in provider.status.message
    disabled = build_vision_provider({'VISION_PROVIDER': 'none', 'GROQ_API_KEY': 'unused'})
    assert not disabled.status.ready and 'switched off' in disabled.status.message


