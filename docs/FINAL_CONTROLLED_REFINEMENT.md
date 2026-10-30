# Controlled final refinement — verification and handover

This release extends the existing unified application. The baseline is the previous Final UI source package. No new application or retrieval system was created.

## Implemented refinement

- Overview retains the compact executive layout: Risk Intelligence first, followed by concise health, risks, actions and scope. The existing detail links, refresh/retry controls and Overview-only Connected workflow with PDF/Word export remain available. Add documents is visually prominent.
- Explicit qualitative risk ratings are extracted from the returned statement, or an immediately adjacent rating-only sentence that clearly refers to the same risk. Structured fields remain supported. Ambiguous, negated, conditional, conflicting and unsafe statements remain unknown. A neighboring different risk cannot donate its ratings.
- All returned records remain represented. Complete comparable ratings become individual nodes; partial and missing ratings remain in labeled evidence groups within the same visualization. Small display offsets preserve source coordinates and show guide lines.
- Medium shares the explicitly labeled Moderate / Medium category. Likely / Unlikely and Major / Minor use their own categorical axes; percentages use percentage axes. No conversion from Likely to High or Major to High is inferred. Mixed-scale records are shown on additional compact plots, not discarded when another scale is selected.
- Source Risk ID/title, owner and due date are displayed when unambiguous literal labels exist in that record's own returned quotations. Internal API identity remains unchanged. Full original wording, evidence and fields remain accessible in details. Missing metadata remains Not stated.
- Existing themes, focus states and reduced-motion rules apply to the matrix, tooltips and controls. Added restrained logo/control polish and compact scrolling for supporting risk evidence. No fake values, trends, rankings or charts were added.

## Existing behavior retained

The shared automatic coordinator already runs Scope, Risk, Blockers, Documentation, Health and the two default assistant briefing requests after indexing settles. It caches by workspace/source version, rejects late responses, avoids duplicate calls and retains stale results during refresh/failure. This implementation was reused unchanged. Empty/unavailable prerequisites do not generate results.

The existing toast implementation dismisses messages after 2.7 seconds including the exit transition, pauses while hovered/focused for accessibility, resumes afterward, and has a close control. Repeated events receive separate identities. Persistent actionable page errors remain available for Retry.

Knowledge Base and Evidence Search remain absent from visible navigation and app routes. Their underlying ingestion/retrieval API capabilities remain intact. The workspace switcher, workspace persistence/isolation, export implementation, routes, contracts, health formula, weights, WordLlama settings, ChromaDB, chunking, provider abstraction and approved M2 agents were not changed.

## Recommended sample dataset

Upload the six files in `sample_documents/` together in a new workspace; do not upload its README. This fictional scenario describes AI Project Intelligence & Risk Advisor itself. It does not amend historical milestones or claim actual defects/assignments.

The documents contain nine named risks, eighteen tasks, consistent owners/dates, milestones, two blockers, decisions, user stories and explicit source ratings. Main risk severity totals are 2 Critical, 3 High, 3 Moderate and 1 Low. Risk ratings appear in structured and natural-language form. No health number or test-pass count is hard-coded in the dataset.

Real default-query verification through WordLlama, ChromaDB and the existing APIs indexed all six files and recovered all nine named risks with their exact probability, impact, severity and Open status. Additional delivery observations can also be returned as risk-register entries; their missing ratings remain unknown. Counts describe returned entries, not verified unique incidents. Compact source summaries support the unchanged bounded retrieval budget. Results on arbitrary new documents remain dependent on the available evidence and existing retrieval limits.

The three Word files and proposal PDF were rendered and visually checked. The CSV was authored/validated from the same canonical task data. Automated tests check matching owners, mitigation deadlines and risk/task IDs across the source files.

## Verification actually executed

| Check | Result |
| --- | --- |
| Complete backend pytest suite, including old regression coverage | **317 passed**, one third-party Starlette/httpx deprecation warning |
| Frontend test cases across 14 existing/new test modules | **152 passed**, zero failed; all modules reported completion |
| Frontend production build (`npm run build`, TypeScript + Vite) | **Passed** |
| New demo metadata consistency and default retrieval | **Passed**; all nine named risks preserved |
| Natural-language rating ingestion through real PDF, DOCX, TXT and CSV | **Passed** |
| Grounding, unknown/ambiguous values and wrong-risk association | **Passed** |
| Existing automatic analysis, cache, stale-response, retry, notifications, workspace and export regression coverage | **Passed in the suites above** |
| Backend Uvicorn process startup and live localhost health/KB/workspace HTTP checks | **Passed** in an isolated temporary empty workspace |
| Sample PDF/DOCX rendering | **Passed**; 9 pages reviewed across the four rendered documents |

Frontend runner limitation: Vitest reported all 152 case results and all 14 module-end events but did not terminate in this environment. Each completed test process was stopped after a bounded wait. These are confirmed passing case results, not a claim of a clean runner exit. No tests were removed or skipped to obtain those results.

Browser limitation: Chromium exited with SIGTRAP during launch, before a page could load. Desktop/mobile screenshots, real-browser overflow, visual hover/animation quality, contrast auditing and reduced-motion appearance therefore remain unverified in this environment. DOM tests cover keyboard/focus behavior, dialogs, mobile-menu behavior, scale representation, filters and controls; those do not replace a browser visual check.

## Preservation and installation

All original source files remain present. Only the ten baseline files listed below were modified; 214 original files, including historical documentation, remain byte-identical. The existing live-verification test rewrites its historical JSON report during execution; that report was restored byte-for-byte from the baseline before packaging.

The archive contains actual source files and the seven-file sample folder. It excludes virtual environments, node_modules, build output, local databases, test runtime data, caches, secrets and QA tooling. Dependencies and lockfiles remain unchanged.

Keep your existing runtime data folders and configured data path when updating the code. Do not delete or replace your local workspace databases. Restart the backend and frontend after copying updated source. Existing saved analyses remain preserved; use the optional Refresh once to apply the improved rating extraction to an already-cached result. New uploads use the existing automatic flow.

Windows setup/run instructions remain in the existing root README. New demo instructions are in `sample_documents/README.md`.

## Files modified

- `backend/app/agents/risk_ratings.py`
- `frontend/src/dashboard/ExecutiveSummary.tsx`
- `frontend/src/dashboard/RiskDetailsDialog.tsx`
- `frontend/src/dashboard/RiskEvidenceBoard.tsx`
- `frontend/src/dashboard/RiskPriorityMatrix.test.tsx`
- `frontend/src/dashboard/RiskPriorityMatrix.tsx`
- `frontend/src/dashboard/riskMatrix.css`
- `frontend/src/dashboard/riskMatrixModel.ts`
- `frontend/src/pages/Overview.tsx`
- `frontend/src/presentation/presentation.css`

## Files added

- `backend/tests/test_risk_natural_ratings.py`
- `backend/tests/test_recommended_demo.py`
- `frontend/src/dashboard/RiskAdditionalPlots.tsx`
- `frontend/src/dashboard/RiskTooltip.tsx`
- `frontend/src/dashboard/riskSourceMetadata.ts`
- `frontend/src/dashboard/riskEvidenceCoverage.test.tsx`
- `sample_documents/AI_Project_Meeting_Notes.docx`
- `sample_documents/AI_Project_Proposal.pdf`
- `sample_documents/AI_Project_Risk_Register.docx`
- `sample_documents/AI_Project_SRS.docx`
- `sample_documents/AI_Project_Sprint_Update.txt`
- `sample_documents/AI_Project_Task_List.csv`
- `sample_documents/README.md`
- `docs/FINAL_CONTROLLED_REFINEMENT.md`
