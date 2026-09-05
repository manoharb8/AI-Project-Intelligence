"""
Document chunking.

Splits normalized text into overlapping, word-bounded chunks. Overlap
preserves context that would otherwise be severed at a chunk boundary
(e.g. a sentence describing a risk that spans two chunks).
"""

from typing import List


def chunk_text(text: str, chunk_size: int = 220, overlap: int = 40) -> List[str]:
    """
    Split text into overlapping chunks of whole words.

    Args:
        text: normalized text to split.
        chunk_size: target number of words per chunk.
        overlap: number of words repeated between consecutive chunks.

    Returns:
        A list of text chunks. Empty input returns an empty list.

    Raises:
        ValueError: if chunk_size is not positive, or overlap is not
            smaller than chunk_size.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be a positive integer")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be >= 0 and smaller than chunk_size")

    words = text.split()
    if not words:
        return []

    step = chunk_size - overlap
    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start += step

    return chunks
