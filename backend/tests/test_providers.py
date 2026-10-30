import pytest

from app.llm.provider import ExtractiveProvider, build_provider


@pytest.mark.parametrize('settings', [
    {},
    {'LLM_PROVIDER': 'extractive'},
    {'LLM_PROVIDER': 'groq', 'GROQ_API_KEY': 'must-not-be-used'},
    {'LLM_PROVIDER': 'openai_compatible', 'LLM_API_KEY': 'must-not-be-used'},
    {'LLM_PROVIDER': 'unknown'},
])
def test_normal_project_analysis_always_uses_local_provider(settings):
    provider = build_provider(settings)
    assert isinstance(provider, ExtractiveProvider)
    assert provider.status.mode == 'extractive'
    assert provider.status.ready is True
    assert 'No generative LLM or external API is used' in provider.status.message
