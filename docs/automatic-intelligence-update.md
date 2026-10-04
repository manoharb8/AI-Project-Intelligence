# Automatic Project Intelligence — change and verification report

This update extends the existing unified application. Earlier milestone reports remain historical and unchanged. Instructions below supersede their manual-only descriptions **only for Project Intelligence**.

## Implemented behavior

- Sidebar order: Workspace → Sources & Search → Project Analysis → Project Intelligence. Existing link labels, icons, paths and mobile navigation remain intact.
- Documentation Studio automatically generates its default User Stories, Risk Register and Action Items when opened with indexed evidence and an available provider. The optional review-focus section retains manual generation. Refresh and Retry are explicit controls.
- Project Health automatically assesses the project with the existing service. The scoring implementation, weights, interpretations, unknown states and calculation text are unchanged.
- Project Assistant prepares a Project Briefing above optional conversational Q&A. The briefing covers scope/deliverables, documented delivery outlook, risk/dependency entries, blockers/decisions, recorded actions, health and evidence gaps. Suggestions to review sources are clearly separate from documented commitments. No automatic questions are inserted into chat.
- The bottom Visual Summary uses returned health values, dimension scores, briefing-statement category counts and missing-owner/date counts. Numeric values and evidence links accompany visuals. Timeline risk is labelled “Higher means more risk.” Statement counts are not presented as unique incidents. No trend or completion metrics are invented.
- Navy navigation, restrained amber/blue accents, softer surfaces, expandable evidence, compact optional controls, section links, limited entry previews and reduced-motion-aware transitions provide focused presentation improvements. Existing M1/M2 screens retain their content and controls.

## Coordination and cache

No endpoint, backend code, database, schema, prompt, scoring rule or retrieval setting was changed. The frontend uses the existing endpoints:

| Result | Existing request |
| --- | --- |
| Documentation | `POST /api/documentation/generate` with the existing default focus |
| Health | `POST /api/project-health/assess` with the existing default focus |
| Briefing delivery outlook | `POST /api/assistant/query`, internal question `Are we on track?`, empty history |
| Briefing blockers | `POST /api/assistant/query`, internal question `What is blocking the project?`, empty history |
| Optional conversation | Existing `POST /api/assistant/query` with the user's question and bounded history |

A fresh briefing therefore needs at most four requests. Documentation and health are reused if a matching default-focus result is already cached. Custom review focuses have separate cache entries. Existing M2 results are **not** passed to these endpoints: the unchanged M3 backend services compose and rerun approved M2 analysis when invoked. Local extractive mode remains available without an external key.

Caches live only in the mounted app session. Opening a relevant route schedules one attempt after readiness has remained stable for 350 ms. A query-keyed resource records completed, insufficient and failed attempts for the current source revision; failure does not create a retry loop. Concurrent consumers share an in-flight request, including React Strict Mode effect replay.

Readiness requires indexed evidence, provider availability, a connected knowledge base, no in-flight summary refresh, and no current upload/indexing operation. Source changes are detected by the existing SessionContext indexed-source revision tracking. An active intelligence view refreshes after changes settle; an inactive view waits until opened. Previous results stay visible with stale or previous-focus labels. Source-version checks and request tokens reject obsolete successes and errors. Explicit Refresh/Retry permits another attempt. Conversation responses also reject a changed source version.

No polling was added. The existing upload polling is unchanged. No document content or evidence is stored in browser storage. A full browser reload clears the session cache, so a ready intelligence page generates again. Out-of-band database changes become visible after the existing knowledge-base refresh; this update does not introduce a background watcher. Invalidating a frontend request prevents its result being accepted; it does not cancel computation already running on the unchanged backend.

## Files changed

| File | Change |
| --- | --- |
| `frontend/src/App.tsx` | Swap Analysis and Intelligence navigation groups only |
| `frontend/src/intelligence/IntelligenceContext.tsx` | Shared automatic resources, route activation, briefing state, source/readiness guards and late chat response rejection |
| `frontend/src/intelligence/Shared.tsx` | Automatic controls, readiness messages and retained-result feedback |
| `frontend/src/intelligence/intelligence.css` | Shared polish, briefing/summary layouts and reduced-motion-aware effects |
| `frontend/src/pages/Documentation.tsx` | Automatic status, optional focus controls and stale feedback |
| `frontend/src/pages/ProjectHealth.tsx` | Automatic status; reuse the unchanged score-ring presentation |
| `frontend/src/pages/Assistant.tsx` | Briefing, optional conversation and bottom visual summary |
| `frontend/src/Intelligence.test.tsx` | Update the former manual-only M3 expectation and add automatic behavior coverage; retain existing grounding/chat checks |
| `frontend/src/Redesign.test.tsx` | Change the expected last mobile navigation link to Project Assistant after the requested reordering; preserve every focus-trap assertion |

## Files added

- `frontend/src/intelligence/AutomaticResource.ts`: versioned, deduplicated session resource cache.
- `frontend/src/intelligence/useAutomaticWork.ts`: route/readiness scheduling and optional custom focus.
- `frontend/src/intelligence/ProjectBriefing.tsx`: source-backed briefing and clearly labelled review guidance.
- `frontend/src/intelligence/VisualSummary.tsx`: actual-value visual summary and calculation/evidence disclosures.
- `frontend/src/intelligence/ScoreRing.tsx`: score-ring component moved unchanged from ProjectHealth for reuse.
- `frontend/src/intelligence/AutomaticResource.test.ts`: focused race, cache, error and readiness tests.
- `docs/automatic-intelligence-update.md`: this change and verification report.

## Verification actually executed

Environment: Linux, Python 3.12.14, Node.js 24.19.0. Tests used the existing installed dependencies; dependency manifests and lockfile were not changed.

| Check | Result |
| --- | --- |
| `python -m pytest -q` from project root | **228 passed**, 2 dependency deprecation warnings |
| `npm test` in frontend | **65 passed** across 5 files |
| `npm run build` in frontend | **Passed**: TypeScript and Vite production build |
| Existing Python live application tests | Both passed as part of the 228-test run; launch the actual FastAPI/Vite services and exercise API flows |
| Existing cross-format/grounding regressions | Passed within the unchanged Python suite, including PDF, DOCX, CSV and TXT sample workflows |
| Automatic interaction coverage | Passed: initial readiness, Strict Mode duplicate prevention, cache reuse, custom focus isolation, indexing waits, source-change refresh, late success/error rejection, explicit retries, partial failures, insufficient evidence and retained results |
| Existing keyboard/mobile interaction tests | Passed in jsdom: menu focus trap, Escape, backdrop, expanded state, hidden navigation and focus restoration; documentation keyboard tabs retained |
| Preservation comparison against uploaded ZIP | All original files remain; backend, APIs/schemas, SessionContext, M1/M2 page implementations, samples, Python tests, historical documents, README and dependency manifests are byte-identical |
| Production browser visual inspection | **Unverified**: local Chromium was unavailable and the browser download failed; the cloud browser refused the local app URL with `ERR_BLOCKED_BY_CLIENT` |

The existing M2 live test rewrites its report as a side effect. Its original historical report was restored byte-for-byte from the input ZIP after testing. No historical report was replaced with current results.

Rendered layouts at 360/768/1024/1440 px, computed contrast, browser keyboard behavior and reduced-motion rendering remain unverified. Responsive CSS and reduced-motion rules are present; jsdom assertions do not establish rendered visual quality. Native Windows execution and an optional live external provider were not tested in this environment.

## Quick verification on your machine

Use the unchanged README setup/run commands. Upload project files, wait for indexing, and open Documentation Studio, Project Health or Project Assistant. Results should prepare without typing or clicking a generation button. Navigate away and back: valid results should remain cached. Upload another source: the active intelligence page should refresh after indexing settles. Expand source quotations and the Visual Summary calculation details. Use optional review focus, Refresh, Retry and follow-up Q&A as needed.

For a clean sample walkthrough, use the existing four files in `samples/`; do not reset or overwrite your current knowledge base. Existing demo instructions remain available in `docs/milestone3-demo.md`, with the automatic M3 page behavior described here.

## Delivery and GitHub

The ZIP contains the complete updated source. It excludes virtual environments, node_modules, local runtime databases, secrets, caches and build output. The local user's existing database is not reset or modified by this package.

No GitHub push was performed: GitHub access was declined, and the attached source archive has no git remote. The updated source is ready to apply to the user's existing checkout without changing its remote or history.
