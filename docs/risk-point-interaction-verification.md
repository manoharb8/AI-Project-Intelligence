# Risk point interaction patch

## Changes

- Desktop point hover/keyboard focus now shows only the documented ID, short title and severity. The compact hint is rendered outside the chart shell (including axes), placed at the closest safe perimeter position, clamped to the viewport and checked against other chart shells. It repositions on scroll/resize and is hidden when no safe position exists.
- Moving off a point, blurring it, Escape, selecting another point, refreshing results or changing severity filters dismisses the hint.
- Clicking/tapping a positioned point opens its full existing fields, original records/conflicts and all supporting evidence inside the existing Positioned risk records rail. The corresponding point and record are selected/highlighted.
- The same detail content is reused from the existing risk detail component. Selecting points no longer opens a modal over the graph. Unpositioned/evidence-card modal behavior is unchanged.
- On touch/coarse-pointer devices hover hints are suppressed. Selection uses the same records panel, below the graph on existing narrow layouts, and brings it into view. No bottom-sheet dependency or layout redesign was introduced.
- Explicit selection moves keyboard focus to the inline detail section. Close/Escape restores focus to the invoking control. The selected state is exposed through ARIA and an announcement.

## Files

Modified:
- frontend/src/dashboard/RiskPriorityMatrix.tsx
- frontend/src/dashboard/RiskAdditionalPlots.tsx
- frontend/src/dashboard/RiskDetailsDialog.tsx
- frontend/src/dashboard/RiskPriorityMatrix.test.tsx
- frontend/src/dashboard/riskEvidenceCoverage.test.tsx

Added:
- frontend/src/dashboard/RiskPointTooltip.tsx
- frontend/src/dashboard/riskInteraction.css
- frontend/src/dashboard/riskPointInteraction.test.tsx
- docs/risk-point-interaction-verification.md

## Actual checks

- Final frontend production build (TypeScript + Vite): passed; Vite build 8.82 seconds.
- Focused test cases: 41 passed, 0 failed across four modules: matrix 18, canonical grouping/labels 13, evidence coverage 4, point interaction 6.
- Tests cover compact hints, safe perimeter placement at 1440/768/360 viewport widths, no-space hiding, full inline evidence, selection switching, filter dismissal, tap behavior, focus restoration, unchanged source data, all nine identified sample risks, ten additional observations, severity filters and label geometry.
- The initial parallel run encountered two five-second timeouts and one evidence-card expectation inadvertently changed to inline behavior; the evidence-card assertion was restored to its existing modal behavior. The final focused run used one worker and a 20-second per-test limit and reported all 41 cases passed.
- In this runtime Vitest reports case/module completion but does not terminate cleanly; bounded workers were stopped after results. These are successful individual test-case/module results, not a clean full-run process exit.
- Byte comparison against the previous ZIP confirms the logo/assets, dashboard/chart design CSS, backend, APIs, scoring/RAG logic, source/grouping/coordinate algorithms, sample data, workspaces, exports, notifications and historical documents remain unchanged.

## Limits

No new browser screenshot/layout verification was completed. The preceding verification established local Chromium launch failures and a blocked connected-browser preview. Actual desktop/touch rendering, tooltip placement and both themes still need a local browser check. The full frontend/backend suites were not rerun for this interaction-only patch; previously documented unrelated frontend regression failures are not claimed resolved. The earlier verification report is retained as historical context.

## Local check

Open Overview, hover a point, then click/tap it. Confirm the short hint stays outside the plot, full evidence appears only in Positioned risk records, the corresponding point is highlighted, and filters/Close/Escape dismiss the appropriate state. Check a narrow screen and both existing themes. No data reset, new dependency or backend setup change is required.
