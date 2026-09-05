"""
Vector store.

Thin wrapper around a persistent Chroma collection. Embeddings are
generated upstream (see embeddings.py) and passed in explicitly, rather
than letting Chroma compute them internally - this keeps "embedding
generation" a distinct, independently testable pipeline stage that
matches the architecture diagram in docs/architecture.md.
"""

from typing import Any, Dict, List

import chromadb

from .models import Chunk

DEFAULT_COLLECTION_NAME = "project_documents"


class ChromaVectorStore:
    """Persists chunk embeddings and supports similarity search over them."""

    def __init__(self, persist_directory: str, collection_name: str = DEFAULT_COLLECTION_NAME):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self._client = chromadb.PersistentClient(path=persist_directory)
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(self, chunks: List[Chunk], embeddings: List[List[float]]) -> None:
        """Add chunks and their precomputed embeddings to the collection."""
        if not chunks:
            return
        if len(chunks) != len(embeddings):
            raise ValueError("chunks and embeddings must have the same length")

        self._collection.add(
            ids=[chunk.chunk_id for chunk in chunks],
            embeddings=embeddings,
            documents=[chunk.text for chunk in chunks],
            metadatas=[
                {
                    "filename": chunk.filename,
                    "file_type": chunk.file_type,
                    "chunk_index": chunk.chunk_index,
                    "doc_id": chunk.doc_id,
                }
                for chunk in chunks
            ],
        )

    def query(self, query_embedding: List[float], top_k: int = 5) -> Dict[str, Any]:
        """Run a similarity search and return Chroma's raw result dict."""
        n_results = min(top_k, max(self.count(), 1))
        return self._collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
        )

    def count(self) -> int:
        """Number of chunks currently stored in the collection."""
        return self._collection.count()

    def clear(self) -> None:
        """Remove every chunk from the collection (used when reprocessing)."""
        existing_ids = self._collection.get().get("ids", [])
        if existing_ids:
            self._collection.delete(ids=existing_ids)

    def list_sources(self) -> List[str]:
        """Return the distinct set of source filenames currently indexed."""
        existing = self._collection.get()
        filenames = {meta.get("filename", "unknown") for meta in existing.get("metadatas", [])}
        return sorted(filenames)
