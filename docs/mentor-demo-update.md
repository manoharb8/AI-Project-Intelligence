# Mentor feedback update

Date: 2026-10-13

This is a focused extension of the existing application. API paths and response schemas, M2 agent extraction, embedding/chunking settings, health calculations, workspace boundaries, navigation, risk matrix interactions and report exports are unchanged.

## Changes

| File | Change |
| --- | --- |
| `backend/app/services/assistant_summary.py` (new) | Formats evidence-backed answers as short bullets; compares only documented severity, reports ties/unknowns, uses the existing calculated health object, and includes only documented actions/owners. |
| `backend/app/services/assistant.py` | Recognizes highest-risk and overall-health questions; preserves full supporting quotations separately; limits default answers and filters blocker replies to explicit blocker/issue language. Open risk status alone does not establish a blocker. |
| `backend/app/services/knowledge_base.py` | Persists a private content fingerprint and serializes duplicate checks with ingestion. Identical successful uploads in the same workspace return the existing document without adding chunks. Public document fields remain unchanged. |
| `frontend/src/pages/Assistant.tsx` | Renders concise answers as bullets and moves quotations, detailed calculations and source metadata into optional View source details. Existing history, retry, stale labels and follow-ups remain available. |
| `frontend/src/intelligence/Shared.tsx` | Collapses filenames and quotations behind View source across documentation, health and briefing components; removes repetitive passage counts from result headings. |
| `frontend/src/components/UI.tsx` | Replaces filename/chunk labels on closed source controls with View source; retains exact text, filename, location and technical references inside expanded details. |
| `frontend/src/pages/AgentAnalysis.tsx` | Removes the secondary passage-count metric; groups analysis-mode metadata and limitations in optional details. Findings, uncertainty and source access remain intact. |
| `frontend/src/dashboard/RiskEvidenceBoard.tsx` | Replaces repeated inline filenames with View source and avoids showing generated internal IDs as documented risk IDs. Actual documented Risk IDs and evidence remain available. |
| `frontend/src/intelligence/intelligence.css` | Adds readable bullet spacing and disclosure styling using existing theme variables. |
| `frontend/src/Agents.test.tsx` | Verifies the renamed source disclosure still exposes evidence and unknown values. |
| `frontend/src/Intelligence.test.tsx` | Updates quotation checks for optional sources and adds a concise-answer display test. |
| `frontend/src/dashboard/RiskPriorityMatrix.test.tsx` | Verifies optional source access and the cleaned evidence-card labels without changing coordinate/filter assertions. |
| `backend/tests/test_mentor_refinement.py` (new) | Tests severity ties/conflicts, concise blockers, unknown health, real incremental retrieval, source-version changes, duplicate prevention, persistence, workspace isolation and both export formats. |
| `sample_meeting_notes/AI_Project_Meeting_Notes_01_Initial_Project_Review.docx` (new) | Fictional 2026-10-05 initial review matching the existing sample project. |
| `sample_meeting_notes/AI_Project_Meeting_Notes_02_Progress_and_Blockers.docx` (new) | Fictional 2026-10-07 progress review matching existing B-01/B-02 and DEC-01. |
| `sample_meeting_notes/AI_Project_Meeting_Notes_03_Export_Readiness_Update.docx` (new) | Fictional 2026-10-08 update with B-03 and T-19, tied to existing R-07. |
| `sample_meeting_notes/README.md` (new) | Exact presentation sequence, questions, expected evidence and limitations. |
| `docs/mentor-demo-update.md` (new) | Change list and actual verification results. |

## Answer behavior

Default project answers use up to three supported findings plus a short disclosure hint when more are available. They are excerpts, not generated project commitments. Explicit requests for details can return more information. The UI preserves all returned quotations for verification.

Highest-risk answers use the highest explicitly stated severity among retrieved risks and report ties. Missing/conflicting severity does not become a fabricated rank. Risk likelihood is not converted into an invented risk score. Recommendations are shown only when documented mitigation/action text exists; otherwise they are Not stated.

Health answers use the unchanged scoring service. The main concern identifies the dimension with the greatest weighted reduction from its maximum health contribution; this explanation does not change the formula or become a delivery prediction.

Unsupported questions use: “This information is not available in the uploaded documents.” Ambiguous conversational follow-ups retain the existing request to name the task or issue. No returned blocker is not evidence that the project has no blockers.

## Incremental update verification

The new integration test uses real WordLlama embeddings, ChromaDB, FastAPI routes and the six original recommended sample files. It verifies:

- The initial export-font question has insufficient evidence.
- Uploading note 03 adds a seventh document and changes the workspace source version.
- Earlier saved results retain their previous source version instead of being relabeled current.
- Retrieval finds the new document; the assistant answers from its exact quotation and identifies Arjun Das.
- Default blocker analysis includes B-03 and documentation generation includes T-19.
- Both report formats contain the update and documented owner.
- Repeating the identical upload, even with a renamed filename, adds no documents/chunks.
- Duplicate detection survives re-opening the knowledge base.
- A second workspace starts empty and never retrieves the first workspace's new facts. Uploading the same file into that second workspace creates its own isolated document.

The frontend's existing automatic coordination was retained. Regression tests exercise automatic analysis, source changes, stale-response rejection, workspace state, upload errors and notifications. No additional polling or external-provider calls were introduced.

## Verification results

- Backend/unit/integration suite: **320 passed**, 2 live tests excluded from that run, 1 dependency deprecation warning. Command: `python -m pytest backend/tests tests -m "not live" -q`.
- Live M1/M2 application test through real FastAPI and Vite servers: **1 passed**. Command: `python -m pytest tests/test_live_application.py -q`.
- Live M3 application test through real FastAPI and Vite servers: **1 passed**. Command: `python -m pytest tests/test_m3_live_application.py -q`.
- Frontend: **182 of 182 collected test cases reported passed** across 17 test files, including the focused changes. Existing Vitest runner processes did not exit after module completion in this environment. Each file was executed with one worker and an incremental reporter; processes were stopped only after all collected case results were reported. This is not a clean full-suite process exit.
- Production build: **passed** (`npm run build`: TypeScript and Vite).
- Meeting notes: all three DOCX files rendered to one page each and visually reviewed after final changes.
- PDF/Word export content, workspace isolation and incremental ingestion: exercised by real backend integration tests, not mocked exports.
- Full browser visual checks: **unverified**. Playwright's default browser was unavailable; the available alternate Chromium executable exited with SIGTRAP before opening a page. No successful desktop/mobile visual inspection, browser download click test or live Windows check is claimed.

The initial backend attempt failed while loading the environment's native Chroma binding. The successful runs used the available compatible QA dependency installation without changing project dependency files. No actual project database was reset. The historical M2 live-verification file was restored after its existing smoke test wrote a temporary result.

## Remaining limitations and presentation guidance

- Retrieval remains bounded. Summaries cover retrieved evidence, not an exhaustive audit or independently verified ranking.
- Byte-identical deduplication applies to newly fingerprinted uploads. Older records are preserved and are not retroactively deduplicated. Different file bytes or formats can still contain semantically repeated statements.
- A changed file is ingested as additional evidence. Arbitrary cross-document revision reconciliation is not implemented; historical and current statements may coexist. The new demo deliberately adds a blocker without silently resolving older ones or altering established risk ratings.
- A health score need not numerically change after adding evidence because existing dimension caps/floors remain unchanged.
- Saved earlier chat answers remain historical. Ask a fresh question after processing the update; stale answers remain labeled.
- The direct follow-up and agent/source access checks passed, but final visual checks on the presentation machine are still needed.

## Applying the update

The source package contains the complete application and the three new notes. Keep your current data directories, environment configuration and virtual environment. Do not delete the existing project or replace its database with an empty folder. Merge the packaged source files into the existing project root (the folder that contains `backend/` and `frontend/`) and restart the backend and frontend. No dependency changes are required by this patch.

For the presentation, follow `sample_meeting_notes/README.md`. Use a new workspace for the sample scenario so it does not mix with existing project records.
