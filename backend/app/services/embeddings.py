"""Only this adapter knows the embedding implementation. No fallback embeddings."""
from typing import Protocol
import numpy as np
from app.core.config import EMBEDDING_DIM

class EmbeddingService(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]: ...

class WordLlamaEmbeddings:
    def __init__(self):
        from wordllama import WordLlama
        self.model = WordLlama.load(config="l2_supercat", dim=EMBEDDING_DIM)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors = np.asarray(self.model.embed(texts), dtype=np.float32)
        if vectors.shape != (len(texts), EMBEDDING_DIM) or not np.isfinite(vectors).all():
            raise RuntimeError('Embedding model returned invalid vectors.')
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        if (norms == 0).any():
            raise ValueError('The text could not be represented by the embedding model.')
        return (vectors / norms).tolist()
