"""Groq is isolated to Flowchart Analysis; other project intelligence remains local."""
import json
from pathlib import Path

import httpx
import pytest

from app.flowchart.imaging import prepare_image
from app.flowchart.provider import (
    DEFAULT_GROQ_VISION_MODEL, GROQ_BASE_URL, build_vision_provider,
)
from app.llm.base import ProviderError
from app.llm.provider import ExtractiveProvider, build_provider

EVIDENCE = [{'id': 'e-1', 'filename': 'plan.txt', 'text': 'The integration is blocked until Security approves staging credentials.'}]


def test_normal_project_provider_always_uses_local_extraction_even_if_groq_is_configured():
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(500)
    provider = build_provider(
        {'LLM_PROVIDER': 'groq', 'GROQ_API_KEY': 'should-not-be-used', 'GROQ_TEXT_MODEL': 'any'},
        httpx.MockTransport(handler),
    )
    assert isinstance(provider, ExtractiveProvider)
    assert provider.status.mode == 'extractive' and provider.status.ready
    provider.generate('blockers', 'find blockers', EVIDENCE)
    assert calls == []


def test_unknown_or_legacy_text_provider_settings_cannot_enable_cloud_calls():
    for value in ('groq', 'openai_compatible', 'unknown'):
        provider = build_provider({'LLM_PROVIDER': value, 'GROQ_API_KEY': 'unused', 'LLM_API_KEY': 'unused'})
        assert isinstance(provider, ExtractiveProvider)


def _image():
    path = Path(__file__).resolve().parents[2] / 'sample_flowcharts' / 'order_flow.png'
    return prepare_image(path.read_bytes())


def test_flowchart_factory_selects_only_groq_and_sends_image_with_token_cap(monkeypatch):
    seen = {}
    result = {'title': 'Example flow', 'is_flowchart': True}
    def handler(request):
        seen['request'] = request
        seen['body'] = json.loads(request.content)
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(result)}}]})
    monkeypatch.setenv('VISION_MAX_TOKENS', '3000')
    provider = build_vision_provider(
        {'VISION_PROVIDER': 'groq', 'GROQ_API_KEY': 'vision-secret', 'GROQ_VISION_MODEL': DEFAULT_GROQ_VISION_MODEL},
        httpx.MockTransport(handler),
    )
    assert provider.status.ready and provider.status.mode == 'groq'
    assert provider.status.model == DEFAULT_GROQ_VISION_MODEL
    assert provider.analyze(_image()) == result
    assert str(seen['request'].url) == f'{GROQ_BASE_URL}/chat/completions'
    assert seen['request'].headers['Authorization'] == 'Bearer vision-secret'
    assert seen['body']['model'] == DEFAULT_GROQ_VISION_MODEL
    assert seen['body']['max_tokens'] == 3000
    content = seen['body']['messages'][1]['content']
    assert content[1]['image_url']['url'].startswith('data:image/png;base64,')


def test_groq_is_default_and_missing_key_is_actionable():
    missing = build_vision_provider({})
    assert not missing.status.ready and 'GROQ_API_KEY' in missing.status.message
    ready = build_vision_provider({'GROQ_API_KEY': 'vision-secret'})
    assert ready.status.ready and ready.status.mode == 'groq'


@pytest.mark.parametrize('provider_name', ['anthropic', 'openai_compatible', 'gemini', 'openrouter', 'other'])
def test_non_groq_vision_providers_are_not_available(provider_name):
    provider = build_vision_provider({
        'VISION_PROVIDER': provider_name, 'ANTHROPIC_API_KEY': 'unused',
        'VISION_BASE_URL': 'https://example.test/v1', 'VISION_MODEL': 'unused',
        'GROQ_API_KEY': 'unused',
    })
    assert not provider.status.ready
    assert 'Only Groq' in provider.status.message


def test_explicitly_disabled_vision_provider_stays_disabled():
    provider = build_vision_provider({'VISION_PROVIDER': 'none', 'GROQ_API_KEY': 'unused'})
    assert not provider.status.ready
    assert 'switched off' in provider.status.message


@pytest.mark.parametrize('status,fragment', [
    (401, 'credentials'), (403, 'credentials'), (404, 'configured model'),
    (413, 'too large'), (429, 'rate limit'), (500, 'temporarily unavailable'),
])
def test_groq_vision_http_errors_are_clear_and_secret_safe(status, fragment):
    def handler(request):
        return httpx.Response(status, json={'error': {'message': 'private body and secret'}})
    provider = build_vision_provider({'GROQ_API_KEY': 'vision-secret'}, httpx.MockTransport(handler))
    with pytest.raises(ProviderError) as error:
        provider.analyze(_image())
    assert fragment.lower() in str(error.value).lower()
    assert 'vision-secret' not in str(error.value) and 'private body' not in str(error.value)


def test_groq_json_mode_fallback_is_bounded_to_one_retry():
    calls = []
    def handler(request):
        body = json.loads(request.content)
        calls.append('response_format' in body)
        if 'response_format' in body:
            return httpx.Response(400, json={'error': {'message': "unknown field 'response_format'"}})
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps({'title': 'flow'})}}]})
    provider = build_vision_provider({'GROQ_API_KEY': 'vision-secret'}, httpx.MockTransport(handler))
    assert provider.analyze(_image()) == {'title': 'flow'}
    assert calls == [True, False]
