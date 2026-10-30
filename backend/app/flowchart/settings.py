"""Environment-driven limits. Read at call time so tests and operators can change them."""
import os


def _number(name, default, low, high, cast=int):
    raw = os.getenv(name, '').strip()
    if not raw:
        return default
    try:
        value = cast(raw)
    except ValueError:
        return default
    return max(low, min(high, value))


def max_edge():
    """Longest image side sent to the model. A conservative configurable limit for provider compatibility."""
    return _number('VISION_MAX_EDGE', 1568, 512, 4096)


def timeout_seconds():
    return _number('VISION_TIMEOUT_SECONDS', 120, 10, 900, float)


def max_output_tokens():
    return _number('VISION_MAX_TOKENS', 8000, 1024, 32000)


def pdf_max_pages():
    return _number('VISION_PDF_MAX_PAGES', 5, 1, 20)
