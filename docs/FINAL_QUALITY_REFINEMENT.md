# Final quality refinement

## Scope and behavior
This patch extends the existing application. Backend, APIs, extraction, scoring, source files, export services, workspace storage and historical documents are unchanged.

- Risk ID labels are single-line, non-wrapping rectangles placed in chart pixels. Placement avoids nearby labels and node markers for the nine-risk sample, within chart bounds. Original probability/impact values and source-coordinate mapping remain unchanged. Existing visual node offsets and guide lines remain presentation-only.
- Main matrix and Overview risk summary group only entries with one unambiguous explicit source Risk ID. Generated API record IDs are not treated as source identities. Multiple-ID quotations remain separate observations. All supporting quotations are retained; detail expansion includes every original grouped record and field.
- Conflicting stated fields are not resolved by guessing: the display leaves the combined field unset, flags the conflict and retains original values for review. No new severity, likelihood or impact is calculated.
- Additional observations remain visible in their own evidence-only area, independently of filters on identified risks. This avoids conflating extracted passages with unique source-identified risks.
- Overview order is header, matrix, connected workflow/export, health, risks, actions, scope. Workflow remains Overview-only; PDF and Word export are unchanged.
- Toast duration remains 2.52 seconds plus 180ms exit animation. Hover and focus pause the remaining duration. Pointer movement outside, focus moving away, route changes and window blur release stale pause state. Callback changes cannot restart the exit timer. Maximum two visible notifications, manual dismissal, no autofocus, and the non-overlapping notification rail remain.
- Navigation group is now Sources. Logo/wordmark are retained, with small alignment and mobile proportion adjustments.

## Executed validation
- Backend: `python3 -m pytest -q` — 317 passed, one dependency warning, 26.02 seconds.
- Frontend: all 170 test cases across 16 modules reported passed, zero test-case failures in the final per-file run. Includes existing regressions plus grouping, conflicts, sample coverage, label geometry, toast timing/events and Overview ordering.
- Frontend runner limitation: Vitest did not exit after reporting module results; a bounded harness terminated each process after completion. This is not a clean full-suite process exit.
- Final targeted sample/label tests: eight cases passed after the last presentation adjustments.
- Production build: `npm run build` (TypeScript and Vite) passed.
- Fresh sample/API check: uploaded all six recommended PDF/DOCX/TXT/CSV documents into a temporary knowledge base; six indexed documents and 126 passages. Scope, risk, blockers, documentation, health and assistant calls returned successfully. Documentation returned 19 records: nine explicitly named risks and ten additional observations. Display severity counts: Critical 2, High 3, Moderate 3, Low 1. The unchanged health service returned 40 for this sample run.
- Test fixture is captured from that sample API run and imported only by tests; never used as application data.
- Geometry tests at plot widths 180, 260, 450 and 800 pixels verify all nine ID rectangles remain in bounds, do not overlap each other or markers, and preserve the original coordinates.
- Browser attempt: Chromium startup failed with SIGTRAP. Live desktop/mobile rendering, theme contrast, actual font metrics, animation appearance and browser keyboard checks remain unverified. Geometry/component checks are not a substitute for live visual inspection. Extremely dense arbitrary datasets may still need the list/details for inspection.
- Byte comparison confirmed all pre-existing non-frontend files unchanged after restoring a historical verification JSON that a backend test rewrites. No runtime database, secrets, dependencies or build output is packaged.

## Changed files
- frontend/src/App.tsx
- frontend/src/Intelligence.test.tsx
- frontend/src/dashboard/ExecutiveSummary.tsx
- frontend/src/dashboard/ProjectInsights.tsx
- frontend/src/dashboard/RiskAdditionalPlots.tsx
- frontend/src/dashboard/RiskDetailsDialog.tsx
- frontend/src/dashboard/RiskEvidenceBoard.tsx
- frontend/src/dashboard/RiskPriorityMatrix.test.tsx
- frontend/src/dashboard/RiskPriorityMatrix.tsx
- frontend/src/dashboard/riskEvidenceCoverage.test.tsx
- frontend/src/dashboard/riskPointLayout.ts
- frontend/src/dashboard/riskSourceMetadata.ts
- frontend/src/experience/Notifications.test.tsx
- frontend/src/experience/Notifications.tsx
- frontend/src/pages/Documents.tsx
- frontend/src/presentation/finalPolish.css

## Added files
- frontend/src/dashboard/canonicalRisks.ts
- frontend/src/dashboard/canonicalRisks.test.tsx
- frontend/src/dashboard/__fixtures__/sampleRiskResult.json
- docs/FINAL_QUALITY_REFINEMENT.md
