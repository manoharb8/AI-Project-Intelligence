"""
Pipeline orchestration.

Wires the individual stages (ingestion -> normalization -> chunking ->
embeddings -> vector store) together. Documents are processed as a
batch: every file is extracted, normalized and chunked, then everything
is embedded and indexed together.

The embedding model (see embeddings.py) is a fixed, pretrained model
with no per-corpus fitting step, so batching is no longer required for
embedding correctness (it was, under a previous TF-IDF-based
implementation - see embeddings.py's module docstring for that
history). Batching is kept here because it's a natural fit for the
Upload & Process UI (upload several files, then process them together)
and because clearing and rebuilding the store per batch keeps the
knowledge base's contents predictable and easy to reason about - not
because it's required for the embeddings to be consistent.
"""

import uuid
from dataclasses import dataclass, field
from typing import List, Tuple

from .chunking import chunk_text
from .embeddings import EmbeddingGenerator
from .ingestion import extract_text, get_file_type
from .models import Chunk, Document
from .normalization import normalize_text
from .vector_store import ChromaVectorStore


@dataclass
class ProcessingResult:
    """Summary of what happened when a single document was processed."""

    filename: str
    document: Document
    chunks: List[Chunk] = field(default_factory=list)
    status: str = "success"  # "success" | "error"
    message: str = ""


def _extract_and_chunk(
    file_input,
    filename: str,
    chunk_size: int,
    overlap: int,
) -> ProcessingResult:
    """Run extraction, normalization and chunking for one file (no embedding yet)."""
    doc_id = str(uuid.uuid4())
    try:
        file_type = get_file_type(filename)
        raw_text = extract_text(file_input, filename)
        normalized = normalize_text(raw_text)

        document = Document(
            doc_id=doc_id,
            filename=filename,
            file_type=file_type,
            raw_text=raw_text,
            normalized_text=normalized,
        )

        if not normalized:
            return ProcessingResult(
                filename=filename,
                document=document,
                chunks=[],
                status="error",
                message="No extractable text found in this file.",
            )

        chunk_texts = chunk_text(normalized, chunk_size=chunk_size, overlap=overlap)
        chunks = [
            Chunk(
                chunk_id=f"{doc_id}_{i}",
                doc_id=doc_id,
                filename=filename,
                file_type=file_type,
                chunk_index=i,
                text=chunk_str,
            )
            for i, chunk_str in enumerate(chunk_texts)
        ]

        return ProcessingResult(
            filename=filename,
            document=document,
            chunks=chunks,
            status="success",
            message=f"Extracted and chunked into {len(chunks)} chunk(s).",
        )

    except Exception as exc:  # noqa: BLE001 - surfaced to the UI, not swallowed
        document = Document(
            doc_id=doc_id, filename=filename, file_type="unknown",
            raw_text="", normalized_text="",
        )
        return ProcessingResult(
            filename=filename, document=document, chunks=[],
            status="error", message=str(exc),
        )


def process_documents(
    files: List[Tuple],
    embedding_generator: EmbeddingGenerator,
    vector_store: ChromaVectorStore,
    chunk_size: int = 220,
    overlap: int = 40,
    clear_existing: bool = True,
) -> List[ProcessingResult]:
    """
    Run a batch of uploaded files through the full pipeline and index them.

    Args:
        files: list of (file_input, filename) tuples. file_input may be a
            filesystem path or a file-like object (e.g. Streamlit's
            UploadedFile).
        embedding_generator: embeds this batch's chunks (no fitting step
            required - see embeddings.py).
        vector_store: chunks + embeddings are added here.
        chunk_size / overlap: passed through to the chunking stage.
        clear_existing: if True (default), the vector store is cleared
            before indexing this batch, so re-processing after adding new
            files replaces the knowledge base's contents with exactly
            what was just uploaded, rather than accumulating duplicates
            of files that were already indexed in a previous run.

    Returns:
        One ProcessingResult per input file, in the same order, so the UI
        can show per-file status even though embedding happens in one
        combined batch.
    """
    if clear_existing:
        vector_store.clear()

    results = [
        _extract_and_chunk(file_input, filename, chunk_size, overlap)
        for file_input, filename in files
    ]

    all_chunks: List[Chunk] = [
        chunk for result in results if result.status == "success" for chunk in result.chunks
    ]

    if not all_chunks:
        return results

    texts = [chunk.text for chunk in all_chunks]
    embeddings = embedding_generator.fit_transform(texts)
    vector_store.add_chunks(all_chunks, embeddings)

    return results
