# Setup and operation

Use the Windows or macOS/Linux commands in the root README. Use 64-bit Python 3.11 with `backend/requirements-windows-py311.txt` on Windows, or Python 3.12 with `backend/requirements-dev.txt` on Linux/macOS, and Node.js 22. Start one FastAPI process; do not add `--workers`.

## Initial installation

Install Python requirements and run `npm ci` in `frontend/`. `requirements-dev.txt` includes the sample-generation and test dependencies. `requirements-lock.txt` records the exact Linux/Python 3.12 packages used in runtime verification; it is not a Windows installer. `requirements-windows-py311.txt` is a separate Windows/Python 3.11 binary-package resolution, not a Windows runtime-test claim; the frontend lockfile is used by `npm ci`.

WordLlama downloads its tokenizer and embedding weights on first use into its normal user cache. Initial startup can therefore take longer. Wait for Uvicorn to report `Application startup complete` before starting the walkthrough. Subsequent runs reuse cached model assets. This project does not ship an external-model API credential.

## Data persistence

By default, data is stored at `backend/data/` regardless of the caller's working directory. Chroma stores vectors and extracted text in `backend/data/chroma/`; document statuses live in `backend/data/documents.json`. These paths are ignored by Git.

An optional `DATA_DIR` environment variable changes the data directory. `.env.example` documents it; the application does not automatically load `.env` files. For example, in PowerShell before launching the backend:

```powershell
$env:DATA_DIR = 'C:\project-intelligence-data'
```

Or on macOS/Linux:

```bash
export DATA_DIR=/absolute/path/project-intelligence-data
```

Restarting the backend retains indexed documents. Restarting with a different empty data directory creates a separate empty knowledge base. Stop the backend before making manual backups; copy the entire data directory consistently.

## URLs

- Frontend: http://127.0.0.1:5173
- Backend health: http://127.0.0.1:8000/api/health
- Interactive API docs: http://127.0.0.1:8000/docs

The frontend's development proxy forwards `/api` to port 8000. Direct frontend fetches remain same-origin. These are local URLs, usable after starting the application on your computer. No public demo was deployed.

`npm run build` produces frontend assets, but it does not host the Python service. Use `npm run dev` for this milestone demo. A production hosting design is deferred.

## Actual-server smoke test

Stop any servers on ports 8000 and 5173 first. The script starts both servers together, uses a temporary knowledge base, uploads all four samples, checks routes and queries, records `docs/milestone2-live-verification.json`, then stops its processes.

Windows, from the project root:

```powershell
.\.venv\Scripts\python.exe scripts\smoke_demo.py
```

macOS/Linux:

```bash
.venv/bin/python scripts/smoke_demo.py
```

The smoke test was executed on Linux. It invokes Node directly, avoiding Windows npm.cmd process-launch issues, and fails before starting when either port is occupied. Windows process execution has not been tested here. Run `.\.venv\Scripts\python.exe -m pytest -q tests` from the root for the same live smoke plus evidence/unknown-field assertions. The test uses a temporary store and explicitly selects local extraction.

## Troubleshooting

- Model download failure: check internet access to the WordLlama Hugging Face repository; do not replace the required model with synthetic embeddings.
- Connection unavailable: check that the backend is ready on port 8000, then select Retry connection.
- Scanned PDF: perform OCR externally and upload a text-containing PDF. There is no OCR dependency in this milestone.
- CSV parse error: ensure UTF-8 encoding, unique nonempty headers, and matching column counts. Quoted commas are supported.
- Port already in use: stop your previous demo process. Avoid running two copies against the same data directory.
- Environment mismatch: on Windows use a fresh 64-bit Python 3.11 environment with `requirements-windows-py311.txt`; elsewhere follow the README platform commands. Use `npm ci` with the supplied frontend lockfile.
- Same-topic but unanswerable question: inspect the returned source passages. Retrieval does not establish that an unstated detail is known.

## Milestone 2 provider setup

Milestone 1 data and collection names are preserved. The new agent pages work with your already indexed documents. Run only one backend against a data directory. To reuse a previous local installation's knowledge base, set `DATA_DIR` to that installation's absolute `backend/data` path before starting the new backend.

The default provider is `extractive`: a working local, rule-based analysis mode. It is explicitly labeled and needs no model API key. WordLlama still performs real semantic retrieval.

For an actual configurable LLM, set these in the backend terminal before startup. In PowerShell:

```powershell
$env:LLM_PROVIDER = 'openai_compatible'
$env:LLM_BASE_URL = 'https://your-provider.example/v1'
$env:LLM_MODEL = 'your-model-name'
$env:LLM_API_KEY = 'your-private-api-key'
```

In bash:

```bash
export LLM_PROVIDER=openai_compatible
export LLM_BASE_URL=https://your-provider.example/v1
export LLM_MODEL=your-model-name
export LLM_API_KEY=your-private-api-key
```

These are placeholders, not a preconfigured service. Select a model/service you have access to. An HTTP loopback URL such as your local model server's `/v1` endpoint is also supported; no model is bundled or hard-coded. Restart the backend after changing these variables. The application does not automatically load a `.env` file.

Visit `/api/agents/status` to check the selected mode. "Configured LLM" reports configuration readiness, not a verified live connection; the connection is exercised when you run analysis. Only retrieved evidence is sent. A service unable to return valid JSON or evidence-grounded statements produces an explicit failure. There is no silent switch to the extractive mode.

The adapter was exercised with mocked HTTP responses. A live external LLM was not configured or tested. Local extraction, API analysis, and real WordLlama/Chroma retrieval were tested end to end over HTTP.

The updated smoke script records `docs/milestone2-live-verification.json` and now verifies all seven UI routes plus all three agent endpoints. The previous `docs/live-verification.json` remains the Milestone 1 record.
