"""
Embedding generation.

Uses WordLlama (https://github.com/dleemiller/WordLlama) - small, static
sentence embeddings distilled from a larger language model. This gives
genuine semantic similarity (e.g. recognizing that "incomplete" and
"not started" describe the same thing) instead of TF-IDF's exact-token
overlap, while staying fully local: no paid API, and - after the one-time
cache-priming step below - no network call at all, on any machine.

## Why this replaced TF-IDF

Milestone 1 originally used TF-IDF (`sklearn.feature_extraction.text.
TfidfVectorizer`) here, chosen because it needed no model download and
could be verified end-to-end in a network-restricted build environment.
Manual testing then surfaced a real failure: the query "Which tasks are
incomplete?" returned distance=1.0 (0% match) against every document,
including `task_list.csv`, which does describe incomplete tasks - just
using the words "Not Started" / "In Progress" rather than "incomplete".
TF-IDF has no way to relate those phrasings: it only measures exact
token overlap, so a query sharing zero words with the indexed text is
mathematically indistinguishable from a genuinely out-of-scope query
(both score a perfect 1.0). This was confirmed by direct reproduction
(see the Milestone 1 changelog / project history), and is an inherent
property of lexical embeddings, not a bug in how the vectorizer was
fit, stored, or restored.

WordLlama's static embeddings capture some of that missing similarity
(e.g. "incomplete" and "not started" score ~0.22 cosine similarity in
isolation, and noticeably higher once embedded as part of a full
sentence/chunk) without requiring PyTorch or a runtime download from a
model hub - a deliberate choice given this project's "no paid API,
reliable on a normal Windows machine" requirement. A full
transformer-based model (e.g. sentence-transformers) would likely give
even better semantic separation, at the cost of a PyTorch install
(several hundred MB, and by default pip resolves a CUDA build unless
you explicitly request the CPU-only wheel) and a model download on
first run. That trade-off is documented in docs/architecture.md
alongside this decision.

## Why no "fit" step is needed anymore

Unlike TF-IDF, WordLlama's embedding space is fixed and pretrained - it
does not depend on the corpus being indexed. This removes an entire
class of previous limitations: no per-batch vectorizer fitting, no
"re-fit the whole knowledge base after adding a document," and no
"re-process after restarting the app because the in-memory vectorizer
was lost." A `fit()` / `fit_transform()` API is kept on this class only
for backward compatibility with existing pipeline code - both are
no-ops / thin wrappers around `embed()`, since there is nothing to fit.
"""

import shutil
from pathlib import Path
from typing import List

import numpy as np
from wordllama import WordLlama

# Only the 256-dim model's weights and tokenizer config are bundled
# directly inside the wordllama wheel - other dimensions would require a
# runtime download. 256 dimensions is more than enough for this corpus.
_DIM = 256
_CONFIG_NAME = "l2_supercat"

_model_instance = None  # process-wide cache: load the (small) model once


def _prime_offline_cache() -> None:
    """
    Copy WordLlama's own bundled weights/tokenizer into the local cache
    directory it expects to find them in.

    This works around a path mismatch in wordllama's own packaging (as
    of the version pinned in requirements.txt): it ships the tokenizer
    config under a "tokenizers/" subfolder but looks for it under
    "tokenizer/" (singular) before falling back to its cache directory.
    Because of that mismatch, the bundled tokenizer is never found via
    the first lookup, and WordLlama.load() would otherwise attempt a
    network fetch from Hugging Face on first use - unnecessary, since
    the file is already sitting in the installed package. Priming the
    cache here means embedding generation never depends on a network
    call, on any machine, from the very first run.

    Idempotent and defensive: if the bundled files aren't where expected
    (e.g. a future wordllama release restructures its packaging), this
    silently does nothing and WordLlama.load() falls back to its normal
    download behavior instead.
    """
    try:
        import wordllama as _wordllama_pkg
        package_dir = Path(_wordllama_pkg.__file__).resolve().parent
    except Exception:
        return

    cache_dir = WordLlama.DEFAULT_CACHE_DIR

    pairs = [
        (package_dir / "tokenizers" / f"{_CONFIG_NAME}_tokenizer_config.json",
         cache_dir / "tokenizers" / f"{_CONFIG_NAME}_tokenizer_config.json"),
        (package_dir / "weights" / f"{_CONFIG_NAME}_{_DIM}.safetensors",
         cache_dir / "weights" / f"{_CONFIG_NAME}_{_DIM}.safetensors"),
    ]
    for source, destination in pairs:
        if destination.exists():
            continue
        if not source.exists():
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(source, destination)


def _get_model() -> WordLlama:
    global _model_instance
    if _model_instance is None:
        _prime_offline_cache()
        _model_instance = WordLlama.load(config=_CONFIG_NAME, dim=_DIM, disable_download=True)
    return _model_instance


class EmbeddingGenerator:
    """
    Embeds text using WordLlama's pretrained static embeddings.

    No fitting is required - `fit()` / `fit_transform()` exist only so
    this class is a drop-in replacement for the previous TF-IDF-based
    implementation used by rag_pipeline/pipeline.py.
    """

    def __init__(self):
        self._model = _get_model()

    @property
    def is_fitted(self) -> bool:
        """Always True: WordLlama's embedding space is fixed, not corpus-dependent."""
        return True

    @property
    def dimensions(self) -> int:
        return _DIM

    def fit(self, texts: List[str]) -> None:
        """No-op: kept for interface compatibility. WordLlama needs no fitting."""
        return None

    def fit_transform(self, texts: List[str]) -> List[List[float]]:
        """Equivalent to embed() - kept for interface compatibility."""
        return self.embed(texts)

    def embed(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of texts into L2-normalized float vectors."""
        if not texts:
            return []
        raw_vectors = self._model.embed(list(texts))
        normalized = []
        for vector in raw_vectors:
            vector = np.asarray(vector, dtype=np.float64)
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = vector / norm
            normalized.append(vector.tolist())
        return normalized

    def embed_one(self, text: str) -> List[float]:
        """Convenience wrapper for embedding a single piece of text (e.g. a query)."""
        return self.embed([text])[0]
