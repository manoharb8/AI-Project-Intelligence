# Overview refinement — implementation and verification

## Scope

This patch extends the existing unified application. It changes frontend presentation, node layout and notification lifetime only. No backend file, API contract, provider, retrieval/chunking/embedding setting, analysis service, health formula, source sample, existing route or historical document was changed. The pre-existing automatic analysis orchestration is reused unchanged. This report is a new document; historical verification reports remain historical.

## User experience

- Overview opens with Risk Intelligence / Risk Priority Matrix, followed by compact Project Health, Key Risks, Key Action Items and a short Scope Summary.
- Key risks and actions show the first three returned records. They are explicitly not ranked by importance. Exact original text is retained; CSS limits visible excerpts. Details links and risk dialogs expose full records and evidence.
- Actual document, indexed-document and passage counts remain visible in the page heading. Health values and score direction are unchanged. Missing health values remain unknown.
- The Connected workflow appears exactly once, only on Overview: Reading documents → Analyzing project → Preparing insights → Ready. The existing PDF / Word export control remains in this section.
- Other routes retain their existing analysis, result controls, evidence and loading/error feedback, without the global workflow bar.
- Review timestamps and supporting limitations are available in a collapsed details section.

## Risk matrix

Each comparable risk record now has its own labeled, keyboard-accessible node. The old shared-coordinate aggregate marker is no longer used for rendering. Exact probability/impact coordinates remain source values. Nearby nodes can move by a bounded screen-space offset (at most 96 px), with fine guides back to their exact coordinate. Tooltips and detail dialogs expose the unchanged source values. Offsets do not indicate different likelihood, impact, rank, trend, relationship or cluster.

The existing severity filters, separate categorical/percentage axis choices, evidence dialog, unknown-rating fallback and severity meanings remain unchanged. Records incompatible with the selected axes remain in the evidence view, with their reason shown; they are not discarded or converted into guessed coordinates. Counts describe returned records, not verified unique incidents.

## Automatic processing

The existing shared session coordinator waits for indexing and provider readiness, runs Scope / Risk / Blockers, and then requests documentation, health and the two existing assistant-briefing sections. Nothing needs a Generate click for normal operation. Completed results are cached by the existing source/result version. Existing duplicate protection, Strict Mode behavior, stale-result rejection and explicit retry are preserved. No extra polling or inference service was introduced. Existing M3 services still compose the M2 analysis path; this patch does not claim they reuse a completed M2 response internally.

## Notifications

Every toast tone now auto-dismisses in approximately 2.7 seconds (2.52 seconds visible plus a 180 ms exit). Hover or keyboard focus pauses the remaining visible duration. Close is explicit. A compact rail below the top bar avoids covering dashboard content. At most two recent notices are shown; related operations retain their existing grouping. Persistent inline error messages and Retry controls remain after a toast closes. Reduced-motion styles remove decorative movement.

## Verification actually performed

- `npm run build`: passed. TypeScript compilation and Vite production build completed (1,645 modules transformed).
- All 13 frontend test files were executed. All **148 collected test cases reported passed**, with 0 failed and 0 skipped; all 13 module-end events were observed.
- The ordinary Vitest run did not terminate after reporting test cases. The same issue occurred with an isolated one-assertion Node-only test. To complete assertion coverage, each test file was run separately with the existing configuration and a diagnostic reporter. Processes were bounded and stopped after test/module results because runner shutdown still did not finish. This is **not a clean-exit full-suite pass**; final runner teardown remains unverified.
- Focused checks cover individual/equal/nearby risk coordinates, unchanged risk fields, missing ratings, filters, dialog evidence, keyboard nodes, toast timing/pause/close, first-upload ordering, no requests before prerequisites, cache reuse, source-change invalidation, stale responses, failures and insufficient evidence.
- Overview tests check the risk-first hierarchy, compact summary values, action details and filters, evidence on demand, preserved health meaning, and Overview-only workflow/export across all current routes.
- Existing regression assertions for agents, uploads, workspace isolation/state, provider readiness, themes, mobile navigation, exports and automatic resources also reported passing.

| Frontend file | Passed cases |
| --- | ---: |
| `src/Agents.test.tsx` | 11 |
| `src/App.test.tsx` | 7 |
| `src/Intelligence.test.tsx` | 29 |
| `src/Redesign.test.tsx` | 16 |
| `src/dashboard/RiskPriorityMatrix.test.tsx` | 18 |
| `src/experience/AutomaticAnalysis.test.tsx` | 8 |
| `src/experience/Notifications.test.tsx` | 7 |
| `src/experience/exportApi.test.ts` | 4 |
| `src/intelligence/AutomaticResource.test.ts` | 8 |
| `src/presentation/Presentation.test.tsx` | 14 |
| `src/uploadIdentity.test.tsx` | 6 |
| `src/workspaces/ViewPersistence.test.ts` | 4 |
| `src/workspaces/Workspaces.test.tsx` | 16 |

## Checks not completed in this environment

- Backend tests were attempted with `python3 -m pytest -q` but could not start: the runtime has no `pytest` module. No backend test result is claimed for this patch. Backend source and existing backend tests were verified byte-for-byte unchanged against the supplied baseline ZIP.
- Chromium was launched for desktop/mobile visual and accessibility QA but exited with SIGTRAP before a page opened, including in a minimal blank-page probe. No successful visual inspection, browser-based accessibility scan or responsive-width verification is claimed. Prepared checks for 360, 768, 1024 and 1440 px remain unexecuted. Unit-level keyboard, mobile-menu and theme checks do not substitute for this visual QA.
- Live backend/upload integration, external providers and Windows operation were not rerun here. No new demo results, scores or screenshots are presented as live evidence.

## Files modified

- `frontend/src/App.tsx`
- `frontend/src/Intelligence.test.tsx`
- `frontend/src/dashboard/ProjectInsights.tsx`
- `frontend/src/dashboard/RiskPriorityMatrix.test.tsx`
- `frontend/src/dashboard/RiskPriorityMatrix.tsx`
- `frontend/src/dashboard/riskMatrix.css`
- `frontend/src/experience/AutomaticAnalysis.test.tsx`
- `frontend/src/experience/Notifications.tsx`
- `frontend/src/experience/experience.css`
- `frontend/src/experience/useNotifications.ts`
- `frontend/src/pages/Overview.tsx`

## Files added

- `frontend/src/dashboard/ExecutiveSummary.tsx`
- `frontend/src/dashboard/executive.css`
- `frontend/src/dashboard/riskPointLayout.ts`
- `frontend/src/experience/Notifications.test.tsx`
- `docs/overview-refinement.md`

## Local verification / use

Use the existing README to start the backend and frontend. In `frontend`, run `npm ci`, `npm test`, and `npm run build` in the supported local environment. Run backend tests using the existing development requirements and `python -m pytest -q` from the project root.

For a manual demo, upload the existing samples on Documents, return to Overview, and observe the automatic workflow. Inspect risk records, severity filters, unknown values and detail links. Use documents with explicit likelihood and impact to check multiple plotted risks. Confirm auto-dismiss toasts, dark/light mode, keyboard navigation, reduced motion and narrow layouts. Export using Overview's Connected workflow.

The ZIP contains complete source files, including `backend/app/main.py` and `frontend/package.json`. It excludes QA fixtures, runtime databases, environment secrets, virtual environments, node_modules, generated builds, temporary logs and caches. Existing local workspace data is not replaced by this source package.
