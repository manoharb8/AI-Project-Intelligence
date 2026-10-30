"""Vision providers. Each returns the model's raw structured answer as a dict.

Error messages are written for the person using the app: they say what to do,
and never contain API keys, request bodies or provider response bodies.
"""
import json
import logging
import re
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from app.flowchart import settings
from app.flowchart.imaging import PreparedImage
from app.flowchart.prompts import SYSTEM_PROMPT, TOOL, TOOL_NAME, user_prompt
from app.llm.base import ProviderError

log = logging.getLogger(__name__)

GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
DEFAULT_GROQ_VISION_MODEL = 'qwen/qwen3.8-27b'
MAX_RESPONSE_BYTES = 4 * 1024 * 1024

SETUP_HINT = ('Flowchart analysis uses Groq only. Set GROQ_API_KEY in the project-root .env file, keep '
              'VISION_PROVIDER=groq, and restart the backend. The default vision model is qwen/qwen3.8-27b. '
              'See docs/flowchart-analysis.md.')


class VisionOutputError(ProviderError):
    """The model answered, but not in a usable shape. Safe to retry once with feedback."""


@dataclass(frozen=True)
class VisionStatus:
    name: str
    mode: str
    ready: bool
    message: str
    model: str | None = None


def _check_url(value, label):
    parsed = urlparse(value)
    local = parsed.hostname in ('127.0.0.1', 'localhost', '::1')
    if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError(f'Set a valid {label} without credentials, query parameters, or fragments.')
    if parsed.scheme != 'https' and not (parsed.scheme == 'http' and local):
        raise ValueError(f'Use HTTPS for a remote {label}, or HTTP for a local endpoint.')
    return value.rstrip('/'), local


def _lenient_json(text):
    """Parse a model answer that may be wrapped in markdown fences or chatter."""
    text = (text or '').strip()
    text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text, flags=re.I)
    for candidate in (text, text[text.find('{'):text.rfind('}') + 1] if '{' in text else ''):
        try:
            value = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(value, dict):
            return value
    raise VisionOutputError('The model did not return valid structured JSON.')


def _error_detail(body: bytes):
    try:
        error = json.loads(body).get('error')
    except (ValueError, AttributeError):
        return ''
    if isinstance(error, dict):
        return str(error.get('message', ''))
    return str(error or '')


class _Http:
    """One bounded, non-redirecting JSON POST that never raises on an HTTP error status."""

    def __init__(self, timeout, transport):
        self.timeout = timeout
        self.transport = transport

    def post(self, url, headers, body):
        try:
            with httpx.Client(timeout=httpx.Timeout(self.timeout, connect=10), follow_redirects=False,
                              transport=self.transport) as client:
                with client.stream('POST', url, headers=headers, json=body) as response:
                    data = bytearray()
                    for piece in response.iter_bytes():
                        data.extend(piece)
                        if len(data) > MAX_RESPONSE_BYTES:
                            raise ProviderError('The model response exceeded the supported size.')
                    return response.status_code, bytes(data)
        except httpx.TimeoutException as exc:
            raise ProviderError(f'The model did not answer within {int(self.timeout)} seconds. Try again, or raise '
                                'VISION_TIMEOUT_SECONDS for large diagrams or slow local models.') from exc
        except httpx.ConnectError as exc:
            raise ProviderError('Could not reach the vision model endpoint. Check your internet connection, '
                                'proxy settings, or that a local model server is running.') from exc
        except httpx.HTTPError as exc:
            raise ProviderError('The vision model request could not be completed. Check the provider configuration.') from exc


def _status_error(status, label, key_hint, model_hint='VISION_MODEL', detail=''):
    if status in (401, 403):
        return ProviderError(f'The {label} rejected the credentials. Check {key_hint}.')
    if status == 404:
        return ProviderError(f'The {label} could not find the configured model. Check {model_hint} and confirm the model is available to your account.')
    if status == 413:
        return ProviderError(f'The {label} rejected the image as too large. Try a smaller export.')
    if status == 429:
        return ProviderError(f'The {label} rate limit or quota was reached. Wait a moment and retry; if it persists, '
                             'check your plan and billing.')
    if status >= 500:
        return ProviderError(f'The {label} is temporarily unavailable or overloaded. Please try again shortly.')
    if status == 400:
        detail_lower = (detail or '').lower()
        if any(term in detail_lower for term in ('image', 'vision', 'multimodal', 'image_url', 'unsupported input')):
            return ProviderError(f'The {label} rejected image input or request options. Confirm {model_hint} supports image input and check JSON mode and image settings.')
        return ProviderError(f'The {label} rejected the request (HTTP {status}). The image or model settings may be unsupported.')
    return ProviderError(f'The {label} rejected the request (HTTP {status}). Check the provider configuration.')


class GroqVisionProvider:
    """Groq's OpenAI-compatible chat-completions API with image input."""

    def __init__(self, base_url, model, api_key='', transport=None, provider_name='Groq Vision API',
                 provider_mode='groq', key_hint='GROQ_API_KEY', model_hint='GROQ_VISION_MODEL'):
        base, local = _check_url(base_url, 'GROQ_BASE_URL')
        if not model.strip():
            raise ValueError('Set VISION_MODEL to a vision-capable model name.')
        self.url = base + '/chat/completions'
        self.model = model.strip()
        self.api_key = api_key.strip()
        self.transport = transport
        self.provider_name = provider_name
        self.provider_mode = provider_mode
        self.key_hint = key_hint
        self.model_hint = model_hint
        self.json_mode = True
        where = 'Images stay on this computer because the endpoint is local.' if local else \
            'Diagram images are sent to the configured model endpoint.'
        self.status = VisionStatus(provider_name, provider_mode, True,
                                   where + ' Connectivity is checked when analysis runs.', self.model)

    def _body(self, image, project_type, page, total_pages, feedback, json_mode):
        body = {'model': self.model, 'stream': False, 'max_tokens': settings.max_output_tokens(), 'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': [
                {'type': 'text', 'text': user_prompt(project_type, page, total_pages, feedback, json_mode=True)},
                {'type': 'image_url', 'image_url': {'url': image.data_url}}]}]}
        if json_mode:
            body['response_format'] = {'type': 'json_object'}
        return body

    def analyze(self, image: PreparedImage, project_type='code', page=None, total_pages=None, feedback=None):
        headers = {'content-type': 'application/json'}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        http = _Http(settings.timeout_seconds(), self.transport)
        status, raw = http.post(self.url, headers, self._body(image, project_type, page, total_pages, feedback, self.json_mode))
        if status == 400 and self.json_mode and 'response_format' in _error_detail(raw).lower():
            self.json_mode = False
            status, raw = http.post(self.url, headers, self._body(image, project_type, page, total_pages, feedback, False))
        if status != 200:
            log.warning('Vision endpoint returned HTTP %s', status)
            raise _status_error(status, self.provider_name, self.key_hint, self.model_hint, _error_detail(raw))
        try:
            content = json.loads(raw)['choices'][0]['message']['content']
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise ProviderError('The vision endpoint returned an unreadable response. Please try again.') from exc
        if isinstance(content, list):
            content = ''.join(p.get('text', '') for p in content if isinstance(p, dict))
        return _lenient_json(content if isinstance(content, str) else '')


class UnavailableVisionProvider:
    def __init__(self, message):
        self.status = VisionStatus('Vision model unavailable', 'unavailable', False, message)

    def analyze(self, *args, **kwargs):
        raise ProviderError(self.status.message)


def build_vision_provider(env=None, transport=None):
    """Build the sole supported external provider: Groq vision.

    No automatic provider switching is performed. The user explicitly chose
    Groq for flowchart analysis only; all normal project analysis is local.
    ``auto`` is accepted as a compatibility alias but still means Groq only.
    """
    import os
    env = os.environ if env is None else env
    choice = (env.get('VISION_PROVIDER') or 'groq').strip().lower()
    if choice == 'none':
        return UnavailableVisionProvider('Flowchart analysis is switched off (VISION_PROVIDER=none).')
    if choice not in ('groq', 'auto'):
        return UnavailableVisionProvider('Only Groq is supported for flowchart analysis. Set VISION_PROVIDER=groq.')

    api_key = (env.get('GROQ_API_KEY') or '').strip()
    if not api_key:
        return UnavailableVisionProvider('Groq vision is selected but GROQ_API_KEY is missing. Add it to the project-root .env file and restart the backend.')

    base_url = (env.get('GROQ_BASE_URL') or GROQ_BASE_URL).strip()
    model = (env.get('VISION_MODEL') or env.get('GROQ_VISION_MODEL') or DEFAULT_GROQ_VISION_MODEL).strip()
    try:
        return GroqVisionProvider(
            base_url, model, api_key, transport,
            provider_name='Groq Vision API', provider_mode='groq',
            key_hint='GROQ_API_KEY', model_hint='GROQ_VISION_MODEL / VISION_MODEL')
    except ValueError as exc:
        return UnavailableVisionProvider(str(exc))
