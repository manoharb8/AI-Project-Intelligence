# Architecture - Milestone 1

## 1. Overview

The platform ingests a project's own documents and builds a queryable
knowledge base using Retrieval-Augmented Generation (RAG). Milestone 1
covers everything from document upload through to retrieval: it does
**not** include answer generation by a language model, automated risk
scoring, forecasting, or a conversational assistant - those are explicitly
out of scope and deferred to later milestones (see Section 6).

## 2. High-level architecture

```
┌─────────────────────────┐       ┌──────────────────────────────────┐
│   Streamlit UI (app/)   │──────▶│   rag_pipeline/ (framework-free)  │
│                          │       │                                    │
│  - Upload & Process      │       │  ingestion.py     -> extract text │
│  - Knowledge Base         │      │  normalization.py -> clean text   │
│  - Query & Retrieve        │     │  chunking.py       -> split chunks│
└─────────────────────────┘       │  embeddings.py     -> WordLlama   │
                                    │                       static vecs │
                                    │  vector_store.py   -> Chroma      │
                                    │  retrieval.py       -> search     │
                                    │  pipeline.py         -> orchestrate│
                                    └──────────────────────────────────┘
```

The `rag_pipeline` package has no Streamlit (or any other UI framework)
imports. Every stage is a plain Python function or class, tested in
isolation in `tests/`. This means the same pipeline could be reused
behind a different interface later (e.g. a FastAPI service) without
touching the pipeline code - only the UI layer would change.

## 3. Data flow (per processing run)

```
Uploaded files (PDF / DOCX / CSV / TXT)
        │
        ▼
extract_text()            - pypdf / python-docx / pandas / plain read
        │
        ▼
normalize_text()          - unify line endings, collapse whitespace,
        │                    drop blank lines
        ▼
chunk_text()               - overlapping word-bounded windows
        │
        ▼
EmbeddingGenerator.embed()  - WordLlama static embeddings (see 5.2)
        │
        ▼
ChromaVectorStore.add_chunks()        - persisted to chroma_db/
        │
        ▼
   (later) retrieve()      - embed query with the same (fixed, pretrained)
                              model, cosine-search Chroma, apply relevance
                              threshold, return ranked chunks
```

## 4. Document model / metadata

Every chunk stored in Chroma carries this metadata, which is what lets
the UI show source and relevance information rather than just raw text:

| Field         | Meaning                                      |
|---------------|-----------------------------------------------|
| `doc_id`      | UUID of the source document                   |
| `filename`    | Original uploaded filename                    |
| `file_type`   | `pdf` / `docx` / `csv` / `txt`                |
| `chunk_index` | Position of this chunk within its document    |

See `rag_pipeline/models.py` for the `Document`, `Chunk` and
`RetrievalResult` dataclasses used throughout the pipeline.

## 5. Key design decisions

### 5.1 Chunking strategy

`chunk_text()` splits normalized text into overlapping windows of whole
words (default: 220 words, 40-word overlap). Overlap means a sentence
that would otherwise be cut in half at a chunk boundary still appears in
full in at least one chunk - this matters for project documents, where a
risk description and its mitigation, or a task and its deadline, can sit
right next to each other.

### 5.2 Embedding approach: what happened, and what's used now

**Milestone 1 originally used TF-IDF** (`sklearn.feature_extraction.text.
TfidfVectorizer`), chosen because it needed no model download and could
be fully verified end-to-end in a network-restricted build environment.
This was documented at the time as an explicit trade-off: TF-IDF is a
purely lexical (exact-token-overlap) technique with no ability to
recognize that two different words describe the same thing.

**That trade-off caused a real bug**, found during manual testing: the
query "Which tasks are incomplete?" returned `distance=1.0` (0% match)
against every indexed chunk, including `task_list.csv` - which does
describe incomplete tasks, just using the words "Not Started" / "In
Progress" rather than "incomplete". Because TF-IDF only measures exact
token overlap, a query sharing zero words with a document is
mathematically identical to a genuinely out-of-scope query: both score a
perfect `distance=1.0`. That is the actual defect - not a bug in how the
vectorizer was fit, stored, or restored between sessions. This was
confirmed by direct reproduction: indexing the sample documents and
querying with the *same in-memory vectorizer instance* (no Streamlit,
no session state, no persistence layer involved at all) reproduced the
identical `distance=1.0` pattern, which rules out a fit/lifecycle bug
and confirms the limitation is inherent to TF-IDF itself.

**The fix: embeddings now use [WordLlama](https://github.com/dleemiller/WordLlama)**
(`rag_pipeline/embeddings.py`), specifically its bundled 256-dimension
"l2_supercat" static embedding model. WordLlama produces small, static
sentence embeddings distilled from a larger language model - this gives
genuine (if limited) semantic similarity: e.g. "incomplete" and "not
started" score roughly 0.22 cosine similarity in isolation, and higher
once embedded as part of a full sentence, instead of TF-IDF's hard zero.
Re-running the exact failing query after the fix now correctly ranks
`task_list.csv` as the top match (see the CHANGELOG-style note at the
end of this section for the actual before/after numbers).

**Why WordLlama and not a full transformer model (e.g.
sentence-transformers)?** A transformer-based sentence encoder would
likely give stronger semantic separation than WordLlama's static
embeddings. The trade-off is a PyTorch install: several hundred MB at
minimum, and by default `pip install torch` on Windows resolves a
CUDA-enabled build (pulling in dozens of NVIDIA packages, multiple GB)
unless you explicitly request the CPU-only wheel via PyTorch's own
package index - an easy thing to get wrong, and this project's
dependency install had already been a source of real friction (32-bit
vs. 64-bit Python, a pandas build failure, etc.) before this fix was
made. WordLlama was chosen instead because:

- Its wheel bundles the pretrained weights directly - no PyTorch, no
  runtime download from a model hub, and (see the offline-cache note
  below) no network call at all, on any machine, from the very first
  run.
- It resolves to a small, plain dependency tree (`numpy`, `safetensors`,
  `tokenizers`, `pydantic`, `requests`) with no GPU/CUDA packages.
- Its semantic separation, while more limited than a transformer model,
  was empirically sufficient to fix the reported bug and to keep a
  clear gap between in-scope and out-of-scope queries (see 5.5).

This is a real trade-off, not a free upgrade: WordLlama's static
embeddings are weaker than a transformer-based encoder at genuinely
novel paraphrases. Section 6 keeps sentence-transformers documented as
a future upgrade path for exactly that reason.

**Offline cache priming.** As installed, WordLlama has a minor path
mismatch in its own packaging: it ships its tokenizer config under a
`tokenizers/` folder inside the wheel but looks for it under
`tokenizer/` (singular) before falling back to a network download. On a
machine with normal internet access this is invisible (the download
just succeeds and gets cached for next time) - but to guarantee this
project never depends on that download succeeding, `embeddings.py`
proactively copies the already-bundled weights and tokenizer config into
WordLlama's expected cache directory the first time `EmbeddingGenerator`
is constructed, then loads with `disable_download=True`. This was
verified by deleting the cache directory entirely and confirming the
model still loads and embeds correctly with zero network access.

**No more "fit" step.** Because WordLlama's embedding space is fixed and
pretrained, embedding no longer depends on the corpus being indexed.
This removes an entire class of limitations that applied under TF-IDF:
no per-batch fitting, no re-fitting when new documents are added, and -
importantly - a freshly restarted Streamlit session produces identical
embeddings to any previous session for the same text, so querying a
knowledge base indexed in an earlier session works correctly with no
re-processing step. `EmbeddingGenerator.fit()` / `.fit_transform()` are
kept as no-op / pass-through methods purely for interface compatibility
with existing pipeline code, not because fitting still happens.

The embedding stage is isolated behind `EmbeddingGenerator`
(`rag_pipeline/embeddings.py`), so it can still be swapped for a
transformer-based model later without changing any other pipeline
stage - see Section 6.

### 5.3 Batch processing (no longer required for correctness, kept for UX)

`pipeline.py` still processes an upload as a batch: every file is
extracted and chunked, then everything is embedded and indexed together.
Under TF-IDF this was required for embedding correctness (IDF weights
depend on the whole corpus). That requirement no longer applies - see
5.2 - but batching is kept because it matches the Upload & Process
page's actual workflow (upload several files, then process them
together) and because clearing and rebuilding the store per batch keeps
the knowledge base's contents predictable.

### 5.4 Vector store

`ChromaVectorStore` (`rag_pipeline/vector_store.py`) wraps a persistent
Chroma collection configured for cosine distance. Embeddings are computed
upstream and passed in explicitly (rather than letting Chroma compute
them internally), which keeps "embedding generation" a distinct,
independently testable stage that matches the pipeline diagram above.

### 5.5 Retrieval threshold

`retrieve()` (`rag_pipeline/retrieval.py`) returns every requested
top-K chunk, but flags each one `is_relevant` based on a distance
threshold (default **`0.85`**, re-tuned for the WordLlama embedding
space described in 5.2 - the previous TF-IDF-era value of `0.90` used a
completely different distance distribution and does not carry over).
This is what lets the platform say "the uploaded documents do not
contain enough information" instead of returning a weakly related
chunk and implying it is an answer.

The threshold was tuned empirically against nine test queries run
against the bundled sample documents: the worst genuinely-relevant top
match scored 0.75-0.82, and the best match for any out-of-scope query
(a cake recipe, the weather, "who is the Prime Minister of India", a
joke about cats) scored 0.87 or higher - a consistent gap, with `0.85`
sitting in the middle of it. Re-tune this by re-running the
reproduction in `tests/test_retrieval.py` if the sample documents,
chunking parameters, or embedding model change again.

**Before/after this fix, for the record:**

| Query | Before (TF-IDF) | After (WordLlama) |
|---|---|---|
| "Which tasks are incomplete?" | distance=1.000 for every chunk (bug) | distance=0.754, top match `task_list.csv` |
| "What are the current project risks?" | distance=0.872, top match `project_risk_report.pdf` | distance=0.633, top match `project_proposal.pdf` |
| "What are the major project blockers?" | distance=0.838, top match `meeting_notes.docx` | distance=0.647, top match `project_proposal.pdf` |
| "Who is the Prime Minister of India?" (out-of-scope) | distance=1.000 (correctly rejected) | distance=0.927 (correctly rejected) |

## 6. Future improvements (explicitly out of scope for Milestone 1)

- **Transformer-based embeddings**: swap `EmbeddingGenerator`'s
  WordLlama model for a pretrained sentence-transformers model, for
  stronger semantic separation on novel paraphrases than WordLlama's
  static embeddings can offer. Requires a PyTorch install (use the
  CPU-only wheel deliberately - see 5.2 for why the default install can
  otherwise pull in a multi-GB CUDA stack) and a one-time model download
  from a model hub. Because `EmbeddingGenerator`'s public interface
  (`embed` / `embed_one`) doesn't leak the implementation, this is a
  change to one file.
- **Answer generation**: add an LLM call over the retrieved chunks to
  produce a synthesized natural-language answer, instead of showing raw
  chunks. This is a self-contained addition on top of the existing
  retrieval step.
- **Risk scoring, delivery forecasting, project health dashboard,
  conversational assistant**: planned for Milestone 2 and Milestone 3
  per the project proposal.

## 7. Known limitations (Milestone 1)

- WordLlama's static embeddings are a real but limited form of semantic
  matching - distilled, non-contextual sentence vectors, not a full
  transformer encoder. They closed the specific gap found in manual
  testing ("incomplete" vs. "Not Started"/"In Progress") and a range of
  other paraphrases tested during that fix, but a sufficiently unusual
  rephrasing could still under-match. Section 6 describes the upgrade
  path if stronger semantic separation is needed later.
- No answer-generation step: the platform returns retrieved chunks, not
  a synthesized answer. This was an explicit scope decision, not a
  missing feature - see Section 6.
- `wordllama` is pinned to an exact version in `requirements.txt`
  (rather than a range) because `embeddings.py` reads specific bundled
  file paths inside the installed package to prime a fully offline
  cache (see 5.2). Upgrading that dependency should be paired with
  re-verifying those paths still exist.
