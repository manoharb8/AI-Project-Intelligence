# Workspace Manager verification

Verified in the local Linux/Python 3.12 environment on 3 October 2026. This report covers the additive Workspace Manager update; historical milestone reports are unchanged.

## Executed checks

| Check | Actual result |
| --- | --- |
| Full `python -m pytest -q` | **250 passed**; includes the 230 pre-existing tests, 20 new workspace tests, existing real WordLlama/Chroma integrations and both existing live-application tests |
| Full `npm test` | **110 passed** across 9 test files; 90 existing tests and 20 new workspace tests |
| `npm run build` | **Passed**: TypeScript checking and Vite production build |
| Live Chromium workspace flow | **33 assertions passed**, no browser JavaScript errors |
| Responsive switcher layouts | **8 combinations**: 360, 768, 1024 and 1440px in light and dark themes; no page/popover overflow in checked views |
| Automated axe WCAG A/AA checks, scoped to the switcher | No violations in the four checked light/dark × mobile/desktop views |

The Python test run emitted two existing dependency deprecation warnings from Starlette/TestClient. No package, lockfile or dependency version was changed to suppress them.

## Isolation and persistence verified

- The original manifest and evidence remain at the original data directory. Registering it and creating another workspace does not delete, move or overwrite it.
- New workspaces start with no indexed documents or saved results. Empty health remains unknown.
- Each existing retrieval, M2-agent and M3-intelligence API reads only the selected workspace's source IDs. PDF, DOCX, TXT and CSV sources were exercised with real WordLlama and persistent Chroma.
- Two concurrent uploads using the same filename remain in different workspace manifests and vector stores.
- Real health output matches the unchanged scoring service for the same sources.
- A separate Python process restores the registry, documents, typed saved results and UI view without running embeddings or analysis again.
- Unknown workspace IDs fail closed; header/path mismatches and duplicate names are rejected; corrupt registry content is not silently reset.
- Obsolete request/source versions cannot overwrite saved current results. The snapshot fingerprint and indexed-source map come from the same manifest snapshot.
- Failed operations preserve previous saved results and release their request tokens.
- Frontend client headers remain fixed to the originating workspace. Switching while an upload or retrieval is in flight cannot move its response or file queue into the other project.
- Valid saved M2/M3 results hydrate without automatic regeneration; inactive workspaces cannot start automatic intelligence. Stale restored results refresh when their workspace becomes active.
- Rapid switches reject late snapshots; switching back to the current project cancels a pending selection. Failed switches preserve the original view and allow an explicit retry.
- View saves are debounced, isolated and serialized, with visible failures and an explicit retry rather than an endless loop.

## Live browser verification

Used temporary test storage outside the source package. Project one used the existing four-format samples; project two used the separately supplied Sample 2 validation documents. Neither project is included as runtime data in the deliverable.

The browser flow created an empty workspace, uploaded its four documents, prepared its own intelligence, switched back to the original analysis/query/conversation, and reloaded both projects. Valid intelligence returned without new generation calls. All returned evidence for the second project belonged to that project's own indexed documents.

Inspected populated and empty states, workspace creation, cached switching, uncached loading, a controlled HTTP 503 failure, successful retry, desktop/mobile menus, keyboard focus and Escape restoration, light/dark mode, and reduced-motion behavior. Screenshots were visually inspected at desktop and mobile widths. The UI's actual sample health values and evidence were displayed; no statistics or projects are seeded by the application.

The final focused frontend coverage also checks that reopening the switcher focuses the active project even when it is not first in the registry.

## Preserved scope

- Existing routes and navigation destinations are unchanged.
- Existing ingestion, extraction, chunking, WordLlama configuration, Chroma collection configuration, retrieval algorithm, M2 agents/prompts, grounding rules, M3 services, provider abstraction and health formula remain byte-identical.
- Existing API result contracts remain unchanged. Workspace selection adds an optional header; clients without it retain the original workspace.
- All pre-existing tests remain unchanged. No historical milestone document, sample file or validation sample was edited. The legacy M2 live test's generated report was restored to its original bytes after the test run.
- The README has an additive workspace notice; all original README content remains intact.
- The only existing page content change is a workspace-aware assistant persistence notice. It explains the newly saved conversation view instead of claiming that every reload clears it.
- No new dependencies, authentication, workspace deletion/reset endpoint, second retrieval pipeline or fabricated project data were added.

## Remaining limits

- Native Windows execution, Firefox/Safari and assistive screen-reader testing were not performed. The existing Windows dependency files and commands are retained.
- Automated accessibility checks here cover the new switcher, not a new whole-application conformance audit. The pre-existing Knowledge Base definition-list semantic issue recorded in the earlier UI verification is outside this feature and remains unchanged.
- This is local single-user project partitioning, not authenticated tenant access control. Run one backend process and retain the existing loopback deployment.
- Old browser-only analysis/chat results cannot be recovered after their earlier session was closed. Existing persisted source evidence is retained; results completed with this update are saved.
- Pending file selections and in-flight requests are not durable across an abrupt tab/process shutdown. A very recent unsaved draft may also be lost. Documents and successfully saved results persist.
- Separate tabs do not have live collaboration; reload to pick up another tab's saved results/view. See `workspaces.md` for storage, recovery and upgrade details.

## Files added

- `backend/app/api/workspaces.py`
- `backend/app/workspaces/__init__.py`
- `backend/app/workspaces/context.py`
- `backend/app/workspaces/schemas.py`
- `backend/app/workspaces/service.py`
- `backend/tests/test_workspaces.py`
- `docs/workspaces-verification.md`
- `docs/workspaces.md`
- `frontend/src/workspaces/ViewPersistence.test.ts`
- `frontend/src/workspaces/ViewPersistence.ts`
- `frontend/src/workspaces/WorkspaceContext.tsx`
- `frontend/src/workspaces/WorkspaceSwitcher.tsx`
- `frontend/src/workspaces/Workspaces.test.tsx`
- `frontend/src/workspaces/api.ts`
- `frontend/src/workspaces/types.ts`
- `frontend/src/workspaces/workspaces.css`

## Files modified

- `README.md`
- `backend/app/api/agents.py`
- `backend/app/api/intelligence.py`
- `backend/app/api/router.py`
- `backend/app/main.py`
- `frontend/src/App.tsx`
- `frontend/src/SessionContext.tsx`
- `frontend/src/api.ts`
- `frontend/src/intelligence/AutomaticResource.ts`
- `frontend/src/intelligence/IntelligenceContext.tsx`
- `frontend/src/intelligence/api.ts`
- `frontend/src/intelligence/useAutomaticWork.ts`
- `frontend/src/main.tsx`
- `frontend/src/pages/Assistant.tsx`

No files were deleted. Source comparison: 16 added, 14 modified, 158 original files unchanged. The complete source package contains 188 files, excluding dependencies, caches and runtime data.
