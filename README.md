# AI Project Intelligence & Risk Advisor

Infosys Springboard virtual internship project. Milestone 1 is approved; Milestone 2 is ready for review.

The unified application ingests project documents, builds a searchable knowledge base, and runs three evidence-grounded analysis agents. It preserves unknown information and shows source references for every finding.

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
| Milestone 3+ features | Not implemented |
| Final ZIP / GitHub push | Not performed |

**The default demo is an extractive baseline, not a generative LLM demo.** This distinction is visible in the interface and API. The configurable LLM adapter can connect to a user-selected compatible model endpoint. Both modes use the same grounding checks. The current development assistant is not used as the application's runtime model.

## Complete project directory

The normal project root is `AI-Project-Intelligence/`. Backend, frontend, tests, configuration, samples, and documentation are present as individual files. Install dependencies and run directly from this folder; no source generator or decoding step is required. Dependencies such as `.venv/` and `node_modules/` are created by setup and are not source deliverables.

## Technology and architecture

React, TypeScript, Vite, Tailwind CSS, Python, FastAPI, Pydantic, WordLlama `l2_supercat` 256-dimensional embeddings, and persistent ChromaDB. No Streamlit, TF-IDF, extra vector database, or hard-coded LLM model.

Document upload → extraction → normalization → fixed chunking → WordLlama → ChromaDB → targeted retrieval → selected provider → schema/evidence validation → structured agent results.

Pages: `/dashboard`, `/documents`, `/knowledge-base`, `/retrieval`, `/scope`, `/risks`, `/blockers`.

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
- Browser visual testing, Windows execution, and public hosting were not verified here. Linux startup, HTTP integration, component tests, and production build were verified.

## Approval gate

Milestone 1 was approved by the user. This delivery stops for `MILESTONE 2 APPROVED`.

Only after that approval: final cleanup, final verification, and final ZIP. GitHub push remains separately gated by an explicit request. Documentation-generation agents, user stories, risk-register generation, health scoring, chatbot, and future aggregate dashboard remain outside this delivery.
