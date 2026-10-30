# Professional report export update

## Installation
This is a focused patch for the existing unified application, not a replacement project. Back up the matching files, copy the backend/ folder in this archive into your existing project root, and restart the backend. Keep existing export fonts and all other project files. No new API, frontend action, environment variable or dependency installation is required. Use Overview > Export / Download > PDF or Word as before. Refresh stale analyses first when a current assessment is required.

## Changed files
- backend/app/exports/report.py: shared report structure, workspace/source freshness, concise summaries, canonical register, editable table data and compact citations; full source quotations and analysis limitations consolidated into the appendix.
- backend/app/exports/render.py: professional PDF and editable Word rendering, headings, repeated table headers, margins, page numbers, embedded matrix and consistent colours.
- backend/app/exports/risks.py (new): export-only grouping by explicit Risk ID, latest unambiguous dated snapshot selection, conflict/missing-value preservation and documented axis scales.
- backend/app/exports/matrix.py (new): high-resolution printable matrix, separate incompatible scales, stated-severity styling and offset labels with leader lines to unchanged coordinates.
- backend/tests/test_exports.py: adapt existing assertions to real Word tables and conditional sections; preserve regression coverage.
- backend/tests/test_report_quality.py (new): seven export quality tests for deduplication, chronology, conflicts, scale parsing, coincident points, unknown ratings and PDF/Word tables/images.

## Data preservation
GET /api/workspaces/{workspace_id}/export?format=pdf|docx is unchanged. Exports use saved workspace results; no additional provider call occurs. Current source-version results are preferred; older results are labelled OUT OF DATE. Existing evidence quotes, severity, health formula, weights and scores are retained. Unidentified observations are separate from canonical identified-risk counts. Short source headings remain in the appendix, not promoted as executive findings. No ingestion, retrieval, scoring, UI, workspace or historical milestone files were changed by this patch.

## Actual verification
- Backend suite: 332 passed, 2 live tests deselected. One existing Starlette/httpx deprecation warning.
- After final report formatting adjustments: 19 export tests passed.
- Frontend: 187 test cases reported passed, 0 failed across 18 files. Vitest processes did not exit after reporting all cases and were terminated by the harness; this is not a clean full-run exit.
- Frontend production build: TypeScript and Vite build succeeded.
- Actual FastAPI upload/indexing: three corrected fictional meeting-note DOCX files ingested using WordLlama and ChromaDB in an isolated temporary workspace. Existing analysis, documentation, health and briefing services executed. Both existing export endpoint formats returned HTTP 200.
- Sample saved results: five identified risks; R-02 probability 4/5 and impact 5/5; calculated health 42/100, Needs attention, partial evidence coverage. These values came from the application, not report constants.
- PDF and DOCX contain the same five Risk IDs, R-02 ratings, health/status and evidence-reference set. Word contains six editable tables and an embedded matrix image.
- Reviewed all rendered pages of the sample PDF and Word output; corrected matrix label/axis collision and repeated delivery text. PDF is 10 pages; Word rendered to 9 pages. Different pagination is expected.
- Partial saved-result subset generated in both formats with missing health and unrated observations; stale state and insufficient evidence remain explicit. Also tested conflicting/missing numeric ratings with isolated fixtures.

## Remaining limitations
- Reports reproduce saved analysis coverage. Local extractive results can be partial or omit facts; exports do not silently rerun or improve the underlying agents.
- Exact historical evidence remains in the appendix; the sample appendix is several pages to preserve traceability.
- Graphs are embedded high-resolution 300-dpi images; Word text and tables are editable, chart nodes are not native editable Word chart objects.
- Layout was checked using PDF rendering and LibreOffice conversion, not native Microsoft Word on Windows. Font availability may slightly change pagination there.
- Browser download clicks and the two excluded live-server tests were not exercised in this environment. Download responses were tested through the real FastAPI endpoint.
- The sample is from the previously corrected fictional demo meeting notes, not real-world project performance data.
