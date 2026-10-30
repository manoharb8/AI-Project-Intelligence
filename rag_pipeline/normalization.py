"""Historical function name over the current normalization service."""
from app.services.text import normalize


def normalize_text(text):
    return normalize(text or '')
