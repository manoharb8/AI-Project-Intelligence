# Milestone 4 — scoped UI correction and interaction patch

Verified: 3 October 2026.

This release extends the existing final Milestone 4 source. It changes presentation only; it does not rebuild the application or change automatic intelligence coordination.

## Visual changes

- Removed the auxiliary sidebar workspace card, its PI avatar, and the internship/footer branding. Retained the main header with the exact text **Project Intelligence & Risk Advisor**, as requested in the final branding instruction. Its custom stacked geometric mark has restrained hover/focus and entrance treatment. No replacement workspace card was added.
- Kept every navigation label, URL and group order: Workspace → Sources & Search → Project Analysis → Project Intelligence.
- Replaced the dashboard health circle with an Evidence Health Comparison: actual returned overall and dimension scores on a current-value 0–100 scale, diamond position markers, subtle ribbons, inspectable values and calculation/evidence links. It contains no time axis or historical trend.
- Replaced the Project Health circle with four layered organic shapes around the actual returned score and interpretation. Compact health summaries use the same non-circular presentation. Shapes are decorative state emphasis, not a new assessment or metric. Their finite reveal animation settles; nothing loops continuously.
- Preserved the returned Scope clarity, Timeline risk and Blocker health values. Timeline risk is plotted directly, without substituting its inverse health contribution. Labels explicitly say **Higher timeline risk = more risk**; the other two dimensions say **Higher = better**.
- Added a Sun/Moon theme switch with native keyboard activation, visible focus and mobile sizing. Light/dark selection is stored only in `sessionStorage` under `project-intelligence-theme`; blocked storage falls back to in-memory operation. No document or evidence content is stored by this feature.
- Added coordinated light/dark surfaces, readable supporting labels, refined button/notification states, finite score/ribbon reveals and reduced-motion overrides. Existing operation messages, retries and success/error conditions remain unchanged.

## Files changed

Modified:

| File | Scope |
| --- | --- |
| `frontend/index.html` | Browser-tab brand text |
| `frontend/src/App.tsx` | Main brand component, removed auxiliary branding, theme provider/switch |
| `frontend/src/main.tsx` | Imports presentation/theme styles |
| `frontend/src/dashboard/ProjectInsights.tsx` | Comparison visual replaces circular score presentation |
| `frontend/src/pages/ProjectHealth.tsx` | Organic health field, interactive dimension visuals, evidence anchors |
| `frontend/src/intelligence/ScoreRing.tsx` | Preserved internal import interface; now renders the organic field |
| `frontend/src/Intelligence.test.tsx` | Two presentation assertions updated for explicit direction/unknown-value controls; existing regression checks retained |

Added:

- `frontend/src/presentation/SidebarBrand.tsx`
- `frontend/src/presentation/Theme.tsx`
- `frontend/src/presentation/HealthVisuals.tsx`
- `frontend/src/presentation/presentation.css`
- `frontend/src/presentation/theme.css`
- `frontend/src/presentation/Presentation.test.tsx`
- `docs/milestone4-ui-patch.md` — this report; previous milestone records are unchanged.

## Preservation verification

Byte comparison against `AI-Project-Intelligence-Milestone4-Final.zip` found exactly the seven modified files above. All 158 other baseline files remain identical, including all 44 backend files, 28 existing documentation files, sample/validation documents, scripts, Python tests, dependency manifests, API types/adapters, SessionContext, IntelligenceContext and scoring logic. No baseline source file was deleted.

The existing live regression test regenerates its M2 verification JSON; that generated copy was restored to the frozen baseline bytes after the test. No historical record was changed in this release.

Source data used in visual QA was indexed into a separate temporary database, outside the packaged project. No existing user database was reset or edited. Test fixtures exist only in tests. No new application dependency was added.

## Tests actually executed

| Check | Result |
| --- | --- |
| `python -m pytest -q` | **230 passed**, including existing backend/integration/live application coverage; 2 dependency deprecation warnings |
| `npm test --prefix frontend` | **90 passed** across 7 files: all 76 existing tests plus 14 focused presentation cases |
| `npm run build --prefix frontend` | **Passed**: TypeScript and Vite production build |
| Real Chromium application rendering | All 10 routes in both themes at 360, 768, 1024 and 1440px: **80 layout cases**, no horizontal page overflow and no browser page errors |
| Real source workflow | Existing PDF, DOCX, TXT and CSV samples uploaded/indexed through the UI; 4 indexed sources and 17 passages observed in the isolated QA database |
| Score preservation | Rendered overall score matched the actual `/api/project-health/assess` response (45 in the supplied sample context); returned dimension scores were 100 scope clarity, 100 timeline risk, 20 blocker health |
| Interaction verification | Keyboard theme activation; focus/hover value inspection and Escape dismissal; mobile menu focus trap, backdrop dismissal, Escape and focus restoration; theme switching issued no additional API requests |
| Motion verification | In Chromium, reduced-motion mode disabled decorative animation/transitions for the brand, page entrance, score, organic layers and ribbons |
| Failure handling | Browser-only simulated HTTP 503 during refresh showed the actual failure state and Retry control while retaining the previous real health result |
| Accessibility scan | axe-core WCAG A/AA rules on 20 route/theme cases; **no colour-contrast violations after fixes**; one existing Knowledge Base definition-list issue remains (see below) |

Focused tests verify score boundaries (0 and 100), exact returned values, unknown values without zero substitution, the timeline-risk direction, evidence links, tooltip interactions, refreshed values, non-circular geometry, session-only theme persistence, blocked storage, unchanged navigation and retained query state.

## Remaining limitations

- The existing Knowledge Base statistics `<dl>` contains a paragraph within a definition group. axe-core reports this as `definition-list` in both themes. It is unchanged under the strict scope; this report does not claim a completely clean accessibility audit.
- Visual/browser interaction checks used headless Chromium on Linux. Native Windows/Edge, Safari, Firefox, hardware touch devices and assistive-technology/screen-reader testing were not performed.
- The local extractive provider was exercised. No live external provider was configured for browser QA; provider logic and contracts remain unchanged.
- Visuals are current-evidence assessments, not historical trends or delivery probabilities. Unknown data remains unknown.
- No GitHub push was performed for this patch. The available local Git setup has no authenticated push credentials; the ZIP is the delivered source.

## Package

The complete unified application contains 172 source/document/sample files. It excludes the test database, dependency environments, `node_modules`, build output, temporary browsers, screenshots, caches and secrets. Existing setup/run instructions still apply. The original historical file inventory is retained; the additions are listed above.
