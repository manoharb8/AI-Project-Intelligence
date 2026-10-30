# Milestone 3 demonstration

Use the same unified application and the original four files in `samples/`. No API key is required. The sample Atlas Portal is fictional controlled validation content.

## Start on Windows

Open the project root in VS Code. Existing installed dependencies may be reused; otherwise:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-windows-py311.txt
cd frontend
npm ci
cd ..
```

Backend terminal, from the root:

```powershell
$env:LLM_PROVIDER = 'extractive'
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend terminal, from the root:

```powershell
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173`. The backend must be running; opening the frontend alone cannot query project evidence. The supplied `.env.example` is instructional and is not automatically loaded. Native Windows execution has not been reverified during M3; Linux/Python 3.12 was used for the recorded checks.

To demonstrate with an empty knowledge base without deleting existing data, set `DATA_DIR` to a new empty directory in the backend terminal **before** starting it, for example `$env:DATA_DIR = Join-Path $env:TEMP ('project-intelligence-demo-' + [guid]::NewGuid())`. Existing stored documents remain in their original directory. Returning to the normal data directory restores that workspace; no database migration is needed.

## Walkthrough

| Step | Page and action | What to review |
| --- | --- | --- |
| 1 | Documents → select `project_proposal.pdf`, `meeting_notes.docx`, `sprint_update.txt`, `task_list.csv` → Upload & index | Queue shows names/sizes; selections append. For the clean original sample set, 4 documents index successfully. |
| 2 | Knowledge Base | 4 indexed documents, 17 traceable passages for this clean set. Existing data or duplicate uploads change counts. |
| 3 | Evidence Search → ask “What are the current project risks?” | Original source passages, filename/location and similarity. This is retrieval, not a generated answer. |
| 4 | Scope & Deliverables → Run analysis | Goals, deliverables, milestones, timelines, responsibilities and expandable exact evidence. |
| 5 | Risk & Delivery, then Blockers & Actions → Run analysis | Schema/contract/staging concerns, stated outlook, actions, source owners/dates and unknown information. No revised date/probability is invented. |
| 6 | Documentation Studio → leave default review focus → Generate documentation | Review User Stories, Risk Register and Action Items tabs. Source-backed drafts; role/value/criteria stay Not stated when unsupported. |
| 7 | Action Items → Show: Missing owner or date | The retention-policy review has no established owner/date. Expand its source instead of inventing an assignment. |
| 8 | Project Health → Assess project health | Overall score, three dimensions, score directions, statement counts, formula and “Why this score?” with evidence. |
| 9 | Project Assistant → “Are we on track?” | Stated delay/outlook with exact quotations. No independent delivery prediction. |
| 10 | Ask “What are our biggest risks?”, “Which tasks are blocked?”, “What are our current deliverables?” | Relevant source statements across TXT/DOCX/CSV and proposal PDF. Expand source references. |
| 11 | Ask “What is the current project health?” | The same scoring service and supporting dimensions. |
| 12 | Ask “What is the approved project budget?” | Explicit insufficient-evidence response; no fabricated budget. |

Observed M3 output for this original clean set and broad focus: **2 partial user stories, 8 risk-register statements, 3 action items, overall evidence health 45/100**. These values come from the recorded live run and may change with source content/focus/provider. They are not stored demo statistics. M3 deduplicates register statements and applies its own bounded composition, so its counts are not the M2 category finding counts.

The health example is scope=100, timeline risk=100, blocker health=20. Explain that 45/100 is a transparent evidence heuristic, not a delivery probability. Expand each dimension's calculation and citations. In an empty/insufficient KB, a numeric overall score is not shown.

## Conversation and session behavior

Ask “Which tasks are blocked by staging?”, followed by “Who owns it?” to demonstrate a specific follow-up. For a broad question returning several subjects, “Who owns it?” is ambiguous and requests a specific subject. The assistant does not treat earlier chat messages as facts.

Navigate away and back: query drafts, filters, documentation, health and chat remain during the app session. After a new successful upload, earlier results are marked potentially out of date. Explicitly rerun; no analysis runs automatically. Reload clears the in-memory session, while ingested sources remain in Chroma. New conversation clears chat and cancels a pending answer.

## Reproducible live validation

Stop both manually running servers so ports 8000/5173 are available. From the project root:

```powershell
.\.venv\Scripts\python.exe scripts\smoke_m3.py --output docs\milestone3-live-verification.json
```

The script starts FastAPI and Vite, uploads the original sources into a temporary knowledge base, checks all ten frontend routes, verifies old and new endpoints, validates exact references and unknown owner/date behavior, checks the weighted score, tests ten assistant questions, then stops both servers. It does not touch the user's normal database or the historical M2 report.

For the full suite:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd frontend
npm test
npm run build
```

The unchanged older M2 live script rewrites `docs/milestone2-live-verification.json`; retain a copy if rerunning that historical script. The M3 smoke script writes only its explicitly requested output. No ZIP, deployment or GitHub push is performed.
