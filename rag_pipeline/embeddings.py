"""Historical convenience methods; the same real WordLlama implementation."""
from app.core.config import EMBEDDING_DIM
from app.services.embeddings import WordLlamaEmbeddings


class EmbeddingGenerator(WordLlamaEmbeddings):
    dimensions = EMBEDDING_DIM
    is_fitted = True

    def embed_one(self, text):
        return self.embed([text])[0]
