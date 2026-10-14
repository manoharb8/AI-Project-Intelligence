# Project Workspace Manager

This additive update extends the same M1–M4 application. A workspace owns its documents, indexed passages, saved retrieval and agent results, health assessments, generated documentation, and assistant conversation view. The existing analysis, grounding and scoring implementations are unchanged.

## Use the switcher

1. Open **Project Workspace** at the top of the application. **Current project** is the original knowledge base, registered in place.
2. Choose **New workspace**, enter a project name, then select **Create workspace**. The new project starts with no documents, evidence or results.
3. Upload that project's PDF, DOCX, TXT or CSV files in Documents. Continue using the existing routes and workflow.
4. Return to the switcher to open another project. Visited projects restore immediately from their own in-memory session. The first visit loads that project's saved snapshot from the backend; a loading notice keeps the previous project visible until the snapshot succeeds.
5. With six or more projects, the switcher includes **Search projects**. Use the keyboard to open the switcher, move between projects with the arrow keys, select with Enter, or dismiss with Escape. Escape and a successful project switch restore focus to the switcher.

The selected workspace ID and theme preference can remain in session storage. Document content, evidence and results are not saved in localStorage or sessionStorage. Completed API results and conversation-view references are saved on the backend. Pending file queues and operation status stay separate in memory during switching; browsers cannot restore an unsubmitted file selection after a reload.

## Preserve an existing installation

Stop both servers before replacing source files. Apply this source update to the existing project folder, retaining its existing **`backend/data/`**, `.env`, virtual environment and installed frontend dependencies. Do not delete the existing project folder or replace its runtime data with an empty directory.

The source ZIP contains no runtime database. Opening a fresh extraction without the original data directory will naturally show an empty original knowledge base. If you run the source from a different directory, set `DATA_DIR` to the absolute path of the existing data directory before starting FastAPI. Keep the same `DATA_DIR` across restarts.

The first startup adds a registry entry for the original store. It does not move, reset, duplicate or re-embed that store. Previously ingested evidence remains available in **Current project**. The earlier application retained completed analyses and conversations only in browser memory; this update cannot recover old results after that old session was closed. Newly completed results are saved per workspace, and existing evidence can be analyzed again with the unchanged services.

Normal Windows startup from the project root is unchanged:

```powershell
# Backend terminal
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

```powershell
# Frontend terminal
npm run dev --prefix frontend
```

No new package or external API key is required. Existing local extractive mode continues to work.

## Storage and isolation

| Location relative to DATA_DIR | Purpose |
| --- | --- |
| `documents.json`, `chroma/` | Original workspace's existing manifest and persistent Chroma store |
| `workspaces.json` | Validated registry: workspace ID, name, creation timestamp and legacy flag |
| `workspace-state.json` | Original workspace's newly saved results and view |
| `workspaces/<workspace-id>/documents.json` | New workspace's separate document manifest |
| `workspaces/<workspace-id>/chroma/` | New workspace's separate persistent Chroma store |
| `workspaces/<workspace-id>/workspace-state.json` | That workspace's saved results and view |

Workspace IDs are generated UUIDs; names never become directory paths. Each workspace uses its own instance of the **existing** KnowledgeBaseService and its own persistent Chroma directory. The same WordLlama adapter and provider abstraction are reused. The collection name, 256-dimensional `l2_supercat` embeddings, 180-word chunks, 30-word overlap and retrieval threshold are unchanged.

An API client is bound to a fixed workspace ID when its React provider is created. Every upload, retrieval and analysis request from that client carries `X-Workspace-ID`. Switching the UI does not change the workspace of an in-flight request. No server-global “selected project” variable exists. An unknown ID fails with 404 instead of falling back to the original project.

Each visited workspace retains its own SessionProvider and IntelligenceProvider. Only the active workspace can start automatic intelligence work. Existing requests may finish for their originating workspace, without putting their response into the currently visible project. Manual Evidence Search and M2 analysis behavior are unchanged.

## Saved results and freshness

- The existing retrieval, M2 and M3 routes save successfully validated outputs into the selected workspace without changing their response contracts.
- Result keys include the operation, trimmed query, and assistant history where applicable. Different review focuses remain distinct; the latest accepted result replaces the previous cache entry for the same key.
- A source fingerprint uses the workspace's indexed document IDs and passage counts. This matches the current append-only ingestion API. The fingerprint does not represent health or a new scoring formula.
- A completed operation is saved only if its request token is still current and its indexed-source fingerprint has not changed. Results completed while documents are processing are not treated as current cache entries.
- Source changes in one project mark only that project's old results stale. The existing automatic intelligence rules refresh active views once ready. Inactive projects refresh when opened; unrelated projects are not regenerated.
- View changes are debounced and serialized per workspace, with a flush on switching/page exit. Save failures are visible, preserve the in-memory view, and offer **Retry saving view**; the same failed save is not retried indefinitely.
- Registry and result/view files use temporary-file replacement. Corrupt persisted state produces an error rather than being silently cleared.

## Additive API contracts

All original URLs, payloads and output schemas remain available. Original clients that omit `X-Workspace-ID` use `legacy`, preserving single-project compatibility. Provider availability is global configuration; project evidence is workspace-specific.

| Method | Route | Contract |
| --- | --- | --- |
| GET | `/api/workspaces` | Returns `default_workspace_id` and the registry's actual workspaces |
| POST | `/api/workspaces` | `{ "name": "Project name" }`; creates an empty workspace and returns 201 |
| GET | `/api/workspaces/{id}/state` | Typed saved results, view, indexed-source map and source fingerprint |
| PUT | `/api/workspaces/{id}/view` | Saves the typed UI view for that workspace; cannot write fabricated analysis results |

Duplicate names, after whitespace normalization and case-insensitive comparison, return 409. Invalid input returns 422. Unknown workspace IDs return 404. A header/path mismatch on snapshot or view requests returns 409. Existing provider/grounding errors retain their existing behavior. There are no workspace deletion or reset endpoints.

## Demo

1. In **Current project**, open Documents and confirm the original sources are still present. Review an existing analysis or run a manual M2 agent. Open Project Health or the assistant briefing to prepare and save intelligence.
2. Create a new workspace using the name of your second project. Show its empty Documents, Knowledge Base and intelligence prerequisites. Unknown health is not presented as a healthy zero-risk result.
3. Upload only that project's source files. Show its separate counts and evidence, then open the automatic intelligence pages.
4. Switch back to **Current project**. Its documents, previous results, review text and conversation return. Switch again and show the other project's own sources and findings.
5. Reload the page after operations finish. The selected project and saved results return without rerunning valid default intelligence.

Sample files are never inserted automatically. Use the supplied samples only as explicitly labeled demo/test inputs, in the appropriate workspace.

## Scope and limitations

- This remains a trusted, local, single-user, **single-backend-process** application. Workspace partitioning is not user authentication, authorization or encrypted tenant isolation. Keep the existing loopback deployment. Multiple Uvicorn workers sharing DATA_DIR are unsupported.
- Browser tabs maintain separate in-memory views. Reload to pick up saved result/view changes made in a different tab. Concurrent edits to the same workspace's view use the last successful write; there is no collaborative editing feature.
- Durable results are the latest accepted output per operation/query/history key, not an immutable audit history of every regeneration.
- In-flight operations, pending file selections and a last unsaved draft are not resumable after abrupt browser/process termination. Already indexed documents and successfully persisted results remain on disk.
- This update retains the original source-storage behavior: extracted evidence is stored in Chroma; it does not add original-file download, deletion, renaming, or reindexing capabilities.
- Native Windows execution and additional browsers require verification on their target systems. Current results are recorded in `workspaces-verification.md`.

## Verify

From the project root, with ports 8000 and 5173 free for the existing live tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
npm test --prefix frontend
npm run build --prefix frontend
```

Focused workspace checks:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\test_workspaces.py -q
npm test --prefix frontend -- src/workspaces/Workspaces.test.tsx src/workspaces/ViewPersistence.test.ts
```

The existing M2 live test writes `docs/milestone2-live-verification.json`. Restore that historical report after verification when no historical documentation update is intended.
