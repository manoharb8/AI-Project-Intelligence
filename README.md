# AI-Driven Enterprise Project Intelligence & Risk Management Platform

**Milestone 1: Document Ingestion & RAG Pipeline**

## Overview

This platform turns a project's own documents - proposals, requirements,
sprint updates, task lists, risk reports, meeting notes - into a
queryable knowledge base, using Retrieval-Augmented Generation (RAG).
Instead of a project manager manually searching through scattered files
to answer "what are our current risks?" or "which tasks are still
open?", the platform retrieves the most relevant passages directly from
the uploaded documents, with source and relevance information attached.

## Problem Statement

Project information (scope, risks, blockers, deliverables, progress)
lives scattered across many document formats and files. Answering a
simple question about project status usually means manually opening and
searching several documents. This platform builds a single, searchable
knowledge base from those documents so that a natural-language question
can be answered directly from project content, without guessing or
fabricating information that isn't actually there.

## Objectives (Milestone 1)

- Ingest project documents in PDF, DOCX, CSV and TXT format.
- Build an actual working RAG pipeline: extraction, normalization,
  chunking, embedding generation, vector indexing and retrieval - not
  just document upload and text extraction.
- Return ranked, relevant chunks for a natural-language query, with
  source document, chunk position and a relevance score.
- Clearly indicate when the uploaded documents do not contain enough
  information to answer a query, rather than fabricating an answer.

Automated risk scoring, delivery forecasting, a project health
dashboard and a conversational assistant are **explicitly out of scope**
for Milestone 1 (see "Future Modules" below).

## Features

- **Multi-format ingestion**: PDF (`pypdf`), DOCX (`python-docx`,
  including table content), CSV (`pandas`), and TXT.
- **Full RAG pipeline**: text extraction → normalization → chunking →
  embedding generation → Chroma vector indexing → retrieval.
- **Configurable chunking**: adjustable chunk size and overlap from the
  UI.
- **Local, offline embeddings**: no external API calls or model
  downloads required to run (see "Technology Stack" for why, and
  `docs/architecture.md` for the upgrade path to a neural embedding
  model).
- **Transparent retrieval**: every result shows its source filename,
  chunk position, and a relevance score; queries the documents can't
  answer are flagged rather than silently guessed at.
- **Custom navigation**: sidebar built with `st.navigation`/`st.Page` for
  proper page titles, icons and a small brand header - not the default
  filename-derived labels.
- **Knowledge-base and retrieval charts**: chunk counts per source, file
  type distribution, and a match-strength chart per query result -
  every chart visualizes numbers the pipeline already computed, nothing
  fabricated or implying an unbuilt feature.
- **Every UI action is wired to the real pipeline** - there are no
  placeholder buttons or fake status indicators.

## System Architecture

```
Streamlit UI  ──▶  rag_pipeline (framework-independent Python package)  ──▶  Chroma (persisted locally)
```

The RAG pipeline has zero dependency on Streamlit, so it is independently
testable (see `tests/`) and could be reused behind a different interface
later (e.g. a FastAPI service) without any changes to the pipeline
itself. Full details, including data flow diagrams and every design
decision, are in [`docs/architecture.md`](docs/architecture.md).

## RAG Workflow

```
Upload (PDF / DOCX / CSV / TXT)
   → Text extraction
   → Normalization
   → Chunking (configurable size/overlap)
   → Embedding generation (WordLlama static embeddings)
   → Chroma vector indexing
   → User query
   → Similarity search
   → Ranked, relevant chunks with source + relevance score
```

## Technology Stack

| Layer | Choice | Why |
|---|---|---|
| UI | Streamlit + Plotly | Fast to build a clean, professional interface without splitting effort across a separate frontend + API layer; the RAG pipeline is kept framework-independent so it isn't locked into Streamlit long-term. Plotly renders the knowledge-base and retrieval charts in the app's own color palette. |
| PDF extraction | `pypdf` | Pure Python, no external binary dependency. |
| DOCX extraction | `python-docx` | Reads paragraphs and tables. |
| CSV extraction | `pandas` | Robust CSV parsing. |
| Embeddings | [WordLlama](https://github.com/dleemiller/WordLlama) static embeddings | Ships pretrained weights bundled in the wheel - no PyTorch, no GPU, and (after a one-time offline-cache priming step in `embeddings.py`) no network call at all, on any machine. Gives genuine (if limited) semantic matching - e.g. recognizing "incomplete" and "Not Started" describe the same thing - which a first TF-IDF-based implementation could not do; see `docs/architecture.md` §5.2 for the bug that was found, why TF-IDF was replaced, and the trade-off against a full transformer model. |
| Vector store | Chroma (`chromadb`) | Local, persistent, no external service to run. |
| Testing | `pytest` | Standard, simple. |

## Project Structure

```
AI-Project-Intelligence/
├── app/                        # Streamlit UI (no pipeline logic)
│   ├── main.py                  # Overview / Dashboard page
│   ├── state.py                 # Shared session-state setup
│   ├── pages/
│   │   ├── 1_Upload_and_Process.py
│   │   ├── 2_Knowledge_Base.py
│   │   └── 3_Query_and_Retrieve.py
│   └── components/
│       └── ui_helpers.py        # Design tokens, CSS, shared render helpers
├── rag_pipeline/                # Framework-independent RAG pipeline
│   ├── models.py                 # Document / Chunk / RetrievalResult
│   ├── ingestion.py               # PDF/DOCX/CSV/TXT → raw text
│   ├── normalization.py            # Text cleanup
│   ├── chunking.py                  # Overlapping word-window chunking
│   ├── embeddings.py                 # WordLlama embedding generation
│   ├── vector_store.py                # Chroma wrapper
│   ├── retrieval.py                    # Query + relevance threshold
│   └── pipeline.py                      # Orchestrates all stages
├── data/sample_documents/       # Realistic sample project documents
├── scripts/
│   └── generate_sample_data.py   # Regenerates the sample documents
├── chroma_db/                    # Persisted vector DB (gitignored contents)
├── tests/                         # pytest suite, one file per stage
├── docs/
│   ├── architecture.md             # Full design rationale, data flow
│   └── setup.md                     # Detailed setup walkthrough
├── requirements.txt
├── README.md
├── .gitignore
└── .env.example
```

## Installation

```bash
python3 -m venv venv
source venv/bin/activate        # venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
```

See [`docs/setup.md`](docs/setup.md) for a fuller walkthrough,
including VS Code interpreter setup and troubleshooting.

## Running the Application

```bash
streamlit run app/main.py
```

Then, in the browser tab that opens:

1. **Upload & Process** - upload PDF/DOCX/CSV/TXT files, or check "Use
   bundled sample documents" to try it immediately. Click
   **Process documents**.
2. **Knowledge Base** - inspect what got indexed.
3. **Query & Retrieve** - ask a question and see ranked, sourced results.

## Testing

```bash
pytest
```

38 tests, all passing, covering:

| Area | What's verified |
|---|---|
| Ingestion | TXT, PDF, DOCX (incl. tables), CSV extraction; unsupported-type handling |
| Normalization | Whitespace/line-ending cleanup, blank-line removal |
| Chunking | Overlap correctness, short/empty input, invalid parameters |
| Embeddings | Determinism (including across separate instances - see restart-survival below), dimensionality, L2 normalization, semantic separation |
| Vector store | Add/count, query with metadata, persistence across client instances, clear, list sources |
| Retrieval | **End-to-end against the real sample documents**: risk queries, blocker queries, multi-document retrieval, source metadata, the insufficient-information case, and **regression tests for a bug found during manual testing** (see below) |

Before this was delivered, the full application was also exercised via
Streamlit's `AppTest` harness (simulating real button clicks and form
submissions) to confirm every page runs without exceptions, both on an
empty knowledge base and after processing the sample documents, and to
confirm restart-survival specifically: processing documents in one
session, then querying from a completely fresh session with zero
reprocessing.

### A bug found during manual testing, and how it's covered now

Manual testing surfaced a real issue that the automated suite hadn't
caught: the query "Which tasks are incomplete?" returned `distance=1.0`
(0% match) against every document, indistinguishable from a genuinely
out-of-scope query. The root cause, why it happened, and the fix (a
change of embedding model, not a threshold tweak) are documented in
[`docs/architecture.md` §5.2](docs/architecture.md#52-embedding-approach-what-happened-and-what-used-now).
`tests/test_retrieval.py` now has explicit regression tests for that
exact query plus three others, including one that asserts the
in-scope and out-of-scope queries remain *distinguishable* - not just
that each individually looks fine.

## Example Queries

Tested against the bundled sample documents:

- "What are the current project risks?" → retrieves from `project_risk_report.pdf` / `project_proposal.pdf`
- "Which tasks are incomplete?" → retrieves from `task_list.csv`
- "What are the major project blockers?" → retrieves from `project_proposal.pdf` / `meeting_notes.docx`
- "Which deliverables are due in Milestone 1?" → retrieves from `project_proposal.pdf`
- "What is the recipe for a chocolate lava cake?" → correctly flagged as **insufficient information** - no fabricated answer.
- "Who is the Prime Minister of India?" → correctly flagged as **insufficient information**.

## Example Workflow

1. Check "Use bundled sample documents" on the Upload & Process page and
   click **Process documents**. Six documents are extracted, normalized,
   chunked, embedded and indexed in a few seconds.
2. On Knowledge Base, see all six sources listed with their chunk counts,
   and expand any chunk to read its content.
3. On Query & Retrieve, click the example query "What are the current
   project risks?" and click **Search knowledge base**. The top result
   is a chunk from `project_risk_report.pdf`, with its relevance score
   shown.

## Future Modules (Not in Milestone 1)

- Automated risk detection and blocker identification
- Delivery forecasting
- Project health scoring and dashboard
- Conversational project-intelligence assistant (LLM-based answer
  generation over retrieved chunks)

These are planned for Milestone 2 and Milestone 3 per the project
proposal, and were deliberately not started here to keep Milestone 1
scoped to a working, well-tested RAG pipeline.

## Limitations

See [`docs/architecture.md` §7](docs/architecture.md#7-known-limitations-milestone-1)
for the full list. In short:

- Embeddings use WordLlama's static (non-contextual) embeddings, not a
  full transformer encoder - real semantic matching, but more limited
  than something like sentence-transformers on genuinely novel
  paraphrases. See architecture doc §5.2 for the bug this fixed and the
  upgrade path.
- No LLM-based answer generation - retrieval returns source chunks, not
  a synthesized answer (an intentional Milestone 1 scope decision).

## Author

Manohar B
