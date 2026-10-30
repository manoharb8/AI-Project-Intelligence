# Final Milestone 4 demo and run guide

This guide describes the current release. Earlier M1–M3 demo files are preserved historical records. Use the existing controlled Atlas Portal sample project; the app displays only ingested/API data, not built-in dashboard statistics.

## Start on Windows

Extract the complete ZIP. Open the `AI-Project-Intelligence` folder in VS Code. Existing dependencies can be reused. For a fresh installation, from that folder:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-windows-py311.txt
cd frontend
npm ci
cd ..
```

Terminal 1 (backend, from the project root):

```powershell
$env:LLM_PROVIDER = 'extractive'
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Terminal 2 (frontend, from the project root):

```powershell
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173`. FastAPI docs are at `http://127.0.0.1:8000/docs`. No external API key is required for the default local extractive mode. Initial dependency/model setup can require internet access. Do not reset or delete an existing data directory merely to run this release.

For an isolated clean demonstration, optionally set a **new** `DATA_DIR` before starting the backend:

```powershell
$env:DATA_DIR = Join-Path $env:TEMP ('project-intelligence-demo-' + [guid]::NewGuid())
```

This switches the demonstration to a separate temporary workspace; it does not delete the normal knowledge base. Omit this setting to retain your existing project data.

## 5–7 minute demonstration

| Step | What to do | What to explain |
| --- | --- | --- |
| 1 | Documents → upload the four original files in `samples/`: `project_proposal.pdf`, `meeting_notes.docx`, `sprint_update.txt`, `task_list.csv` | One KB accepts PDF, DOCX, TXT and CSV. Queue and operation feedback reflect real stages. |
| 2 | Knowledge Base | Review actual indexed counts. A clean original set has 4 indexed documents and 17 passages; counts change with existing or additional sources. |
| 3 | Evidence Search → ask about ticket API dependencies | Results are original passages with filenames/locations and retrieval similarity, not generated answers. |
| 4 | Scope & Deliverables, Risk & Delivery, Blockers & Actions → explicitly Run analysis | Preserve the manual M2 flow. Expand an evidence quotation and point out stated versus missing details. |
| 5 | Overview | Project Insights prepares automatically. Explain the documented goal/deliverables, health ring and direction of dimension bars. |
| 6 | Dashboard risks and actions | Filter a risk category or actual action status. Expand the exact source. Counts mean returned entries, not independently verified incidents or ranked priorities. |
| 7 | Dashboard → Why this score? | Show the unchanged formula and evidence. Timeline risk is adverse when high; scope/blocker health improve when high. Unknown evidence is not treated as healthy. |
| 8 | Documentation Studio and Project Health | Default results reuse the shared cache. Review all three documentation tabs, missing-owner/date filtering and the full health explanation. Optional focus editing and manual regeneration remain available. |
| 9 | Project Assistant | The briefing is already prepared. Ask an optional follow-up, then “What is the approved project budget?” to demonstrate insufficient evidence. Internal briefing questions never appear as user chat turns. |
| 10 | Documents → add one of the existing `validation_samples/agent_project.*` files, then return to Overview | Earlier documents remain indexed. Previous intelligence is labeled stale until refreshed results for the new source version are available. |
| 11 | Select the same just-uploaded file again in the same browser session | The exact duplicate is skipped with a visible explanation. No new document is added and no unnecessary intelligence refresh occurs. |
| 12 | Open workspace Status and use keyboard navigation | Show actual source/provider status, Escape dismissal, clear focus and mobile navigation. |

The validation files are existing test documents. Preview them before a mentor demo and explain that they are controlled examples, not new facts about an actual project. No sample is inserted automatically. Changed documents append evidence; old statements are not silently replaced or declared obsolete.

## Truthful presentation points

- Health is a deterministic evidence heuristic, not a prediction probability.
- Missing owner/date stays “Not stated”; no person or commitment is assigned by the dashboard.
- No finding count establishes the number of unique real-world incidents.
- Unavailable/insufficient evidence never means “No risks.”
- Exact-source duplicate detection is session-based, not database-wide across browser reloads.
- Manual Refresh can invoke the configured provider again. The app does not continuously poll for intelligence.
- Current validation was on Linux/Python 3.12; native Windows runtime and browser visual acceptance are still unverified for this release.

## Reproduce tests

Stop other servers on ports 8000 and 5173 before the full Python suite, because existing live tests start their own servers. From the project root:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
npm test --prefix frontend
npm run build --prefix frontend
```

Targeted incremental API validation:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\test_m4_incremental.py -v
```

For Linux, replace the Python command with `.venv/bin/python`. The real integration tests use temporary data directories. A legacy M2 live test rewrites its historical JSON report when run; review your working-tree diff and restore that historical report if you are only verifying the current release.

## Browser acceptance checklist still to perform

At 360, 768, 1024 and 1440 px: inspect Overview, all M1/M2 routes and all intelligence pages; test empty/indexing/populated/error states; expand long evidence, filter actions/risks, and verify no horizontal page overflow. Check Tab/Shift+Tab, mobile Escape/backdrop/focus restoration, status popover dismissal and reduced motion. Automated DOM interaction tests passed, but this is not a substitute for checking actual rendering.

## Publish the prepared Git changes

The release ZIP also includes `Milestone4.patch` beside the complete project folder. The source folder runs independently; the patch is only for applying the release to your existing Git clone without reconstructing files.

The environment could read the repository but could not push because GitHub sign-in credentials were unavailable. No remote branch was modified. From a clean, signed-in local clone of your existing repository:

```powershell
git status --short
git pull --ff-only
git am "C:\path\to\extracted-release\Milestone4.patch"
git push origin main
```

Run the last three commands only after confirming `git status --short` is empty. The patch was prepared against `0876aac01d54e1dd63acbd1fc450b7293eac4342`. If your local repository has newer conflicting changes, stop and review them; `git am --abort` returns to the pre-application state. Do not force-push. Use your normal GitHub sign-in flow locally; do not paste credentials into chat.

The release commit message is `Complete Milestone 4 insights dashboard and final product polish`.
