# AI Project Intelligence & Risk Advisor

> **Workspace Manager update:** Use the top project switcher to create and reopen isolated project workspaces. The original knowledge base remains in **Current project**. See [workspace usage, upgrade and storage](docs/workspaces.md) and [workspace verification](docs/workspaces-verification.md). Retain your existing runtime data directory when applying this source update. The historical milestone records below remain unchanged.

> **Milestone 4 final release:** Start with the [current run and demo guide](docs/final-demo.md), [M4 architecture](docs/milestone4.md), [final project report](docs/final-project-report.md), [verification](docs/milestone4-verification.md) and [release file manifest](docs/milestone4-files.md). Overview now prepares a real-data Project Insights dashboard automatically. Earlier milestone documentation and the previous README text below are retained as historical records; older manual-only behavior and delivery-status statements describe those earlier versions.

Infosys Springboard virtual internship project. Milestones 1 and 2 are approved historical foundations. Milestone 3 extends the same application with documentation generation, explainable project health, and conversational project intelligence.

The unified application ingests project documents, builds a searchable knowledge base, and runs three evidence-grounded analysis agents. Milestone 3 uses that evidence to structure user stories, risk registers and actions, assess project health, and answer project questions. Unknown information remains visible and outputs retain source references.

## Implementation status

| Area | Status |
| --- | --- |
| Milestone 1: ingestion, knowledge base, semantic retrieval | Implemented and regression-tested |
| Scope and Deliverable Extraction Agent | Implemented |
| Risk Detection and Delivery Forecasting Agent | Implemented; outlook is limited to explicit source statements |
| Blocker and Action Item Identification Agent | Implemented |
| All four document formats | Validated with all three agents |
| Local extractive runtime | Working without an API key; real WordLlama retrieval plus deterministic English extraction rules |
| Configurable LLM runtime | Implemented and tested with mocked HTTP responses; no live external model was configured or tested |
| Milestone 3: Documentation Generation Agent | User stories, risk register and action lists, with evidence and explicit unknowns |
| Milestone 3: Project Health | Deterministic scope, timeline-risk and blocker dimensions; documented calculation |
| Milestone 3: Conversational Assistant | RAG-grounded source quotations, bounded follow-ups and insufficient-evidence responses |
| Final ZIP / GitHub push | Not performed |

**The default demo is an extractive baseline, not a generative LLM demo.** This distinction is visible in the interface and API. The configurable LLM adapter can connect to a user-selected compatible model endpoint. Both modes use the same grounding checks. The current development assistant is not used as the application's runtime model.

## Complete project directory

The normal project root is `AI-Project-Intelligence/`. Backend, frontend, tests, configuration, samples, and documentation are present as individual files. Install dependencies and run directly from this folder; no source generator or decoding step is required. Dependencies such as `.venv/` and `node_modules/` are created by setup and are not source deliverables.

## Technology and architecture

React, TypeScript, Vite, Tailwind CSS, Python, FastAPI, Pydantic, WordLlama `l2_supercat` 256-dimensional embeddings, and persistent ChromaDB. No Streamlit, TF-IDF, extra vector database, or hard-coded LLM model.

Document upload → extraction → normalization → fixed chunking → WordLlama → ChromaDB → targeted retrieval → selected provider → schema/evidence validation → structured agent results.

Pages: `/dashboard`, `/documents`, `/knowledge-base`, `/retrieval`, `/scope`, `/risks`, `/blockers`, `/documentation`, `/project-health`, `/assistant`.

New endpoints: `POST /api/documentation/generate`, `POST /api/project-health/assess`, `POST /api/assistant/query`. Existing M1/M2 endpoints and contracts are unchanged. All three features run with the default no-key provider; results are generated only on request.

Start with the [Milestone 3 demo](docs/milestone3-demo.md), [M3 architecture and API contracts](docs/milestone3.md), [health scoring methodology](docs/health-scoring.md), and [current verification report](docs/milestone3-verification.md). Earlier milestone documents below remain historical records.

See [complete file tree and source links](PROJECT_FILES.md), [architecture](docs/architecture.md), [Milestone 1](docs/milestone1.md), [Milestone 2](docs/milestone2.md), [setup](docs/setup.md), [demo guide](docs/demo.md), and [verification](docs/verification.md).

## Windows setup

Use 64-bit Python 3.11 and Node.js 22. The supplied Windows/Python 3.11 requirements were resolved against compatible binary distributions. Runtime tests here used Linux/Python 3.12; Windows execution is not claimed. Package installation and the first WordLlama asset download require internet access. No API key is needed for the local extraction mode.

From the project root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-windows-py311.txt
cd frontend
npm ci
cd ..
```

Backend terminal, from the project root:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend terminal, from the project root:

```powershell
cd frontend
npm run dev
```

Open [the local app](http://127.0.0.1:5173) after both servers are ready. [FastAPI documentation](http://127.0.0.1:8000/docs) exposes the API. These URLs refer to the computer running the servers; no public Python app is hosted.

## macOS/Linux setup

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-dev.txt
cd frontend
npm ci
cd ..
```

Backend terminal:

```bash
cd backend
../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend terminal:

```bash
cd frontend
npm run dev
```

## Optional LLM configuration

The default is `LLM_PROVIDER=extractive`. To use a compatible LLM, set these environment variables in the backend terminal before starting it:

```powershell
$env:LLM_PROVIDER = 'openai_compatible'
$env:LLM_BASE_URL = 'https://your-provider.example/v1'
$env:LLM_MODEL = 'your-model-name'
$env:LLM_API_KEY = 'your-private-api-key'
```

The URL and model above are placeholders. Use a real endpoint/model you have access to. Local HTTP loopback endpoints are supported; remote endpoints require HTTPS. No provider is hard-coded to Ollama, Qwen, or OpenAI. The adapter uses the chat-completions JSON protocol, so the selected service must support it.

Only selected evidence is sent to the configured endpoint. Credentials remain in the backend environment. `.env.example` is documentation; `.env` is not automatically loaded. Provider configuration is read at startup. An invalid configuration or failed LLM call produces an explicit error; there is no silent fallback to local extraction.

## Testing and samples

Windows:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm test
npm run build
```

macOS/Linux:

```bash
cd backend
../.venv/bin/python -m pytest -q
cd ../frontend
npm test
npm run build
```

`backend/requirements-lock.txt` records the tested Linux/Python 3.12 environment and is not a portable installer. `backend/requirements-windows-py311.txt` pins a Windows/Python 3.11 resolution including test dependencies. `requirements.txt` and `requirements-dev.txt` remain the platform-resolved source requirements. `frontend/package-lock.json` records the frontend dependency versions. The integration tests use actual WordLlama and ChromaDB. HTTP model-provider tests use deterministic mocked responses; the suite does not require a live LLM service.

- `samples/`: the four original Atlas Portal demonstration documents. One upload gives 4 indexed documents and 17 chunks.
- `validation_samples/`: equivalent agent-validation content in PDF, DOCX, CSV, and TXT. Each format was tested independently against each agent.
- `scripts/create_samples.py`: regenerate original fixtures.
- `scripts/create_agent_samples.py`: regenerate Milestone 2 fixtures.
- `scripts/smoke_demo.py`: start both real servers, verify routes/uploads/retrieval/agents, then stop them. Use when ports 8000 and 5173 are free. The smoke script explicitly selects local extraction and a temporary data directory.
- `scripts/smoke_m3.py`: run the unified M1 → M2 → M3 live flow, ten frontend routes, and ten assistant questions, using temporary data. Run `python scripts/smoke_m3.py --output docs/milestone3-live-verification.json` from the installed environment. It does not change the historical M2 report.
- `data/sample_documents/`: preserved older M1 fixtures used by the frozen root-level tests. These source documents are separate from runtime `backend/data/`.
- `rag_pipeline/`: compatibility imports for the older root-level tests, whose original package was absent from the supplied archive. They reuse current extraction, chunking and WordLlama services. The application does not import this adapter package.

The root-level live test additionally verifies source references and unknown action fields. From the project root on Windows:

```powershell
.\.venv\Scripts\python.exe -m pytest -q tests
```

On macOS/Linux:

```bash
.venv/bin/python -m pytest -q tests
```

It launches and stops both actual servers; stop manually running servers first. Use either this test or `scripts/smoke_demo.py` for the same live walkthrough. Root `python -m pytest -q` runs backend and live tests together.

All sample project content is fictional controlled validation material.

## Limitations

- Local extraction uses conservative English rules. It can miss indirectly worded facts, complex names, pronouns, contextual assignments, and nonstandard dates. Unknown values remain null.
- The LLM adapter is implemented but has not been tested against a live configured model. Do not describe mocked HTTP tests as live model validation.
- Grounding rejects missing/unretrieved IDs, altered quotes, schema violations, unsupported category assignments, and provider-supplied extra facts. It does not prove real-world truth or resolve conflicts between documents.
- Quotations are complete segments within the retrieved chunks, which can themselves end mid-sentence because Milestone 1 uses fixed word windows. Read expanded evidence for context. This is not a general entailment verifier.
- Agent retrieval is bounded to 12 unique passages and 14,000 characters. Missing means not established in the retrieved evidence; it does not prove absence from the whole knowledge base. The analysis focus guides retrieval, not a conversational answer.
- WordLlama's 0.16 cutoff is calibrated on controlled samples, not a broad benchmark. Same-topic but unsupported questions can retrieve related text. No unsupported answer, owner, date, risk probability, or forecast date is generated.
- Delivery outlook quotes stated delays, threats, or forecasts. There is no statistical delivery-date predictor.
- PDF must contain extractable text; no OCR or encrypted PDFs. DOCX body paragraphs/tables are supported; headers, footnotes, and image text are not. CSV/TXT must be UTF-8.
- Single-user, single-backend-process local application, without authentication or project isolation. Keep it on loopback. Original extracted evidence persists in `backend/data/`; uploads with duplicate names get separate IDs.
- M3 user stories require explicit requirement wording. Benefits, acceptance criteria, likelihood and mitigations remain unknown when they are not stated. Generated entries are reviewable drafts.
- Project health is a documented evidence heuristic, not a delivery probability. Missing timeline/blocker evidence prevents an overall score; silence is never interpreted as no risks. Differently worded statements may describe the same incident.
- The assistant supports conservative English question patterns and clear follow-ups. It organizes exact quotations; it is not unrestricted generative chat. It ignores assistant history as a source of project facts.
- Browser visual testing was blocked by the preview environment. Native Windows execution, a live external model, public hosting, and a complete manual assistive-technology audit were not performed. Linux startup, actual HTTP integration, component tests, and the production build passed; see the current verification report for exact results.

## Milestone boundaries and delivery

M1 provides ingestion, indexing and source retrieval. M2 provides Scope & Deliverables, Risk & Delivery, and Blockers & Actions. M3 adds documentation, health and conversational workspaces over those services. Historical M1/M2 documentation, tests, samples and source logic are preserved. The M3 formula and compatibility additions are explained separately in the new documentation.

Current verification: 228 Python tests passed (188 backend, 38 historical M1 compatibility tests, two live application tests); 48 frontend tests passed; production build passed. Two dependency deprecation warnings remain. No external API key is needed for these checks.

The legacy `scripts/smoke_demo.py` writes its M2 verification JSON when invoked. During M3 verification, that historical file was restored byte-for-byte after running the unchanged legacy live test. Use the M3 smoke script for a new verification report.

No final ZIP has been created and nothing has been pushed to GitHub. Both require an explicit request.
