# Logo and Risk Priority Matrix visual correction

## Scope

This is a presentation-only patch to the existing unified application. The approved open blue/amber monogram replaces the enclosed badge in both the sidebar and workspace selector. The wordmark is unchanged.

The matrix now has a dedicated chart/legend area and independently scrolling records rail, a 330px desktop plot (previously 246px), compact summary metrics, soft probability/impact zones, ring markers, horizontal ID pills, finite entrance/filter transitions and hover emphasis. At narrower container widths the legend and records move below the chart. Mobile records remain accessible rather than being hidden. Both theme palettes and reduced-motion rules are included.

The chart's screen-space label/point layout is unchanged. Source coordinates, qualitative mapping, ID grouping, conflicts, evidence, filters and details are unchanged. Unpositioned identified risks and additional evidence-only observations remain available. Long explanatory text remains under “How to read this view”. The connected workflow/export remain immediately after the matrix.

## Files changed

- `frontend/src/presentation/IntelligenceMark.tsx`: uses the same approved open mark in both existing placements.
- `frontend/src/presentation/IntelligenceMark.test.tsx`: verifies shared asset and unchanged accessible branding.
- `frontend/src/presentation/referenceFinish.css`: replaces the previous presentation layer with the new matrix composition, markers, legend, theme and responsive rules.
- `frontend/src/dashboard/RiskPriorityMatrix.tsx`: adds heading/metric grouping and chart/legend composition; retains all risk/evidence logic.
- `frontend/src/dashboard/canonicalRisks.test.tsx`: adds five label-layout size cases for the new chart proportions.

Added:

- `frontend/src/assets/intelligence-monogram.png`: approved generated transparent brand asset.
- `docs/visual-correction-verification.md`: this report.

## Executed verification

| Check | Actual outcome |
| --- | --- |
| Frontend `npm run build` (TypeScript + Vite) | Passed; final output includes the new logo, heading composition and styles. |
| Backend `python3 -m pytest -q` | 317 passed, 1 Starlette/httpx dependency deprecation warning, 90.65 seconds. |
| Initial full frontend test-case run | 167 of 170 reported passed; 3 reported failed. This is NOT a clean frontend-suite pass. |
| Expanded canonical-risk/label module | 13 of 13 cases reported passed. |
| Final branding module | 1 of 1 case reported passed. |
| Sample risk matrix DOM checks | All 9 named source risks, all 10 additional observations, severity counts/filters, unchanged input data and evidence grouping passed. |
| Label geometry checks | Passed at 180×230, 260×230, 450×230, 800×230, 170×320, 210×320, 330×300, 510×330 and 720×330 chart pixels. Checks include chart bounds, collisions with markers/labels and unchanged source coordinates. These are geometry tests, not browser screenshots. |
| Fresh sample ingestion + existing analysis APIs | All 6 PDF/DOCX/TXT/CSV documents indexed, 126 passages; 19 raw risk entries; health score 40. Source-ID grouping produces 9 identified risks plus 10 separate observations. |
| Source comparison against supplied latest ZIP | No source file deleted. Backend, API contracts, risk extraction, grouping/layout algorithms, health formula, session/workspace services, exports, notifications, other pages, sample documents and historical documentation byte-identical. |

The frontend runner reports individual test results/module completion but does not consistently exit in this runtime. Bounded test processes were terminated after reporting results. Case/module results above are not presented as successful full-run exit codes.

### Frontend regression failures / limitations

The initial full run reported failures in these existing tests outside the visual patch:

1. `Intelligence.test.tsx`: “chat retains its draft, exact answer and unknown owner/date across navigation” — the first globally selected quotation was not visible.
2. `Intelligence.test.tsx`: “chat retry retains earlier useful answers without duplicating the failed question” — multiple “Insufficient evidence” elements matched an unscoped text query.
3. `Workspaces.test.tsx`: “saved M2 results and default intelligence hydrate without rerunning completed analysis” — an expected zero request count was one.

Follow-up runs were not consistently clean, including runs against the unchanged baseline. The baseline workspace module subsequently reported all 16 cases passed, and chat-retry ambiguity also appeared on the baseline. Follow-up intelligence runs showed additional timing/state assertion failures. This patch does not modify those services or weaken their tests. Full frontend regression clearance remains outstanding; do not interpret the targeted visual tests as resolving these failures.

### Browser/visual verification blocked

Local Playwright Chromium exited at launch with SIGTRAP. The connected browser rejected the local preview URL with `ERR_BLOCKED_BY_CLIENT`. Consequently no rendered screenshot comparison, actual desktop/mobile overflow inspection, both-theme browser verification, keyboard/focus browser walk-through or animation/reduced-motion visual inspection was completed. These checks remain unverified. The provided reference images were inspected and used as design direction; they are not proof of the implemented browser rendering.

## Run locally

Use the existing README setup commands. No dependency or backend configuration changes are required. Restart the frontend and reload the Overview. Confirm the open monogram, ring markers, expanded chart and scrolling records panel at desktop and mobile sizes in both themes. On the included sample data, check all nine named risks, all ten additional observations, filters, tooltips and evidence details. Keep all existing local workspace data; do not reset or overwrite the runtime database when replacing source files.

## Packaging

Complete source ZIP retains every original project file. It excludes node_modules, virtual environments, build outputs, test runtime databases, temporary browser/test files, caches and secrets. Historical test output modified by the backend test run was restored from the baseline before packaging.
