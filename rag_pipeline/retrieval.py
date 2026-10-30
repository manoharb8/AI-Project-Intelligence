"""Historical result shape over the same WordLlama/Chroma cosine search."""
from app.core.config import MIN_SIMILARITY
from rag_pipeline.models import RetrievalResult


def retrieve(query, generator, store, top_k=5):
    if not store.count():
        return []
    found = store.query(generator.embed_one(query), top_k)
    return [RetrievalResult(ident, meta['filename'], text, float(distance), 1-float(distance) >= MIN_SIMILARITY)
            for ident, meta, text, distance in zip(found['ids'][0], found['metadatas'][0], found['documents'][0], found['distances'][0])]


def has_sufficient_information(results):
    return any(result.is_relevant for result in results)
