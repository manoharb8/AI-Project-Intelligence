"""Compatibility for historical explicit-window unit tests; no UI controls."""
from app.core.config import CHUNK_WORDS, CHUNK_OVERLAP
from app.services.text import chunks, normalize


def chunk_text(text, chunk_size=CHUNK_WORDS, overlap=CHUNK_OVERLAP):
    if chunk_size <= 0 or overlap < 0 or overlap >= chunk_size:
        raise ValueError('Chunk size must be positive and overlap smaller than the chunk size.')
    if (chunk_size, overlap) == (CHUNK_WORDS, CHUNK_OVERLAP):
        return chunks(text)
    words = normalize(text).split()
    result = []
    for start in range(0, len(words), chunk_size-overlap):
        result.append(' '.join(words[start:start+chunk_size]))
        if start+chunk_size >= len(words):
            break
    return result
