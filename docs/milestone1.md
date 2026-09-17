# Milestone 1 — approved foundation

Milestone 1 was approved by the user and is preserved in the unified application.

## Implemented behavior

PDF, DOCX, CSV, and TXT uploads are extracted into source units, normalized, and chunked into fixed 180-word windows with 30-word overlap. WordLlama l2_supercat supplies 256-dimensional embeddings. ChromaDB persists vectors and evidence; an atomic manifest tracks document status. Semantic retrieval returns relevant passages, exact source references, and an explicit insufficient-information result when no passage passes the cutoff.

The frontend retains Overview, Documents, Knowledge Base, and Retrieval. Upload status, per-file errors, counts, source details, empty states, and connection errors remain available. The sidebar places these functions in the Milestone 1 group, with Overview in Workspace.

## Preservation evidence

This directory-layout revision did not change the Milestone 1 API router, API schemas, configuration, extraction/chunking, embeddings, or knowledge-base service. Their existing behavior is exercised by 56 backend regression cases and seven earlier frontend cases. Backend persistence tests reopen the actual Chroma store, including in a separate process. Real-server smoke uploads all four original files and tests successful and unrelated queries through Vite's API proxy.

Original fixtures in `samples/` describe a fictional Atlas Portal project; one upload gives four indexed documents and 17 chunks. Existing user data can be reused through the same `DATA_DIR` and Chroma collection configuration.

## Scope limits

No OCR or encrypted PDFs; DOCX body paragraphs and tables only; UTF-8 CSV/TXT. Chunk settings are fixed in code. Retrieval is candidate evidence, not proof of answerability or external truth. The application is local, single-user, and single-process.

Milestone 2 extends this foundation with the three agents documented in `milestone2.md`.
