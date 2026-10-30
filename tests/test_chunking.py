import pytest

from rag_pipeline.chunking import chunk_text


def test_chunk_text_basic():
    text = " ".join(f"word{i}" for i in range(50))
    chunks = chunk_text(text, chunk_size=20, overlap=5)
    assert len(chunks) > 1
    # every chunk should have at most chunk_size words
    for chunk in chunks:
        assert len(chunk.split()) <= 20


def test_chunk_text_overlap_preserves_boundary_words():
    text = " ".join(f"word{i}" for i in range(30))
    chunks = chunk_text(text, chunk_size=10, overlap=3)
    first_chunk_words = chunks[0].split()
    second_chunk_words = chunks[1].split()
    overlap_words = set(first_chunk_words[-3:])
    assert overlap_words.issubset(set(second_chunk_words))


def test_chunk_text_short_input_returns_single_chunk():
    text = "just a few words here"
    chunks = chunk_text(text, chunk_size=220, overlap=40)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_empty_input_returns_no_chunks():
    assert chunk_text("", chunk_size=100, overlap=10) == []


def test_chunk_text_invalid_overlap_raises():
    with pytest.raises(ValueError):
        chunk_text("some text here", chunk_size=10, overlap=10)
    with pytest.raises(ValueError):
        chunk_text("some text here", chunk_size=0, overlap=0)
