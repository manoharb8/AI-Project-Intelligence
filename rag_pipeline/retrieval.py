"""
Retrieval.

Ties the embedding generator and vector store together into a single
query API, and applies a distance threshold so the platform can honestly
say "the uploaded documents do not contain enough information" instead
of returning weakly-related chunks as if they were a good answer.
"""

from typing import List

from .embeddings import EmbeddingGenerator
from .models import RetrievalResult
from .vector_store import ChromaVectorStore

# Cosine distance ranges from 0 (identical) to 2 (opposite; in practice
# roughly 0-1 for the embeddings used here). Chunks with a distance at or
# below this value are considered relevant to the query.
#
# Tuned against the bundled sample project documents using WordLlama
# embeddings (see embeddings.py): across nine test queries, the worst
# genuinely-relevant top match scored 0.75-0.82, and the best match for
# any out-of-scope query (weather, jokes, a cake recipe, "who is the
# Prime Minister of India") scored 0.87 or higher - a consistent gap.
# 0.85 sits in that gap with margin on both sides. Re-tune this by
# re-running the reproduction in tests/test_retrieval.py if the sample
# documents, chunking parameters, or embedding model change.
DEFAULT_DISTANCE_THRESHOLD = 0.85


def retrieve(
    query: str,
    embedding_generator: EmbeddingGenerator,
    vector_store: ChromaVectorStore,
    top_k: int = 5,
    distance_threshold: float = DEFAULT_DISTANCE_THRESHOLD,
) -> List[RetrievalResult]:
    """
    Embed a query, search the vector store, and return ranked results.

    Every result is returned (even ones below the relevance threshold) so
    the UI can show what was found, but `is_relevant` flags which ones
    should actually be trusted as an answer.
    """
    if vector_store.count() == 0:
        return []

    query_embedding = embedding_generator.embed_one(query)
    raw = vector_store.query(query_embedding, top_k=top_k)

    ids = raw.get("ids", [[]])[0]
    documents = raw.get("documents", [[]])[0]
    metadatas = raw.get("metadatas", [[]])[0]
    distances = raw.get("distances", [[]])[0]

    results: List[RetrievalResult] = []
    for chunk_id, text, meta, distance in zip(ids, documents, metadatas, distances):
        results.append(
            RetrievalResult(
                chunk_id=chunk_id,
                filename=meta.get("filename", "unknown"),
                file_type=meta.get("file_type", "unknown"),
                chunk_index=meta.get("chunk_index", -1),
                text=text,
                distance=distance,
                is_relevant=distance <= distance_threshold,
            )
        )
    return results


def has_sufficient_information(results: List[RetrievalResult]) -> bool:
    """True if at least one retrieved chunk is above the relevance bar."""
    return any(result.is_relevant for result in results)
