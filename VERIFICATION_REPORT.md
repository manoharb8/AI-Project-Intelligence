# Verification Report — AI Project Intelligence & Risk Advisor

**Build date:** 2026-10-29  
**Scope:** Targeted upgrade of the supplied project; no replacement application was created.

## Changes made

- Groq is restricted to the flowchart-vision provider path. Ordinary project intelligence uses the original local extractive provider and does not call an external API.
- Configured only `GROQ_VISION_MODEL=qwen/qwen3.8-27b` for Flowchart Analysis. Normal text-analysis model configuration is not used by the application.
- Added safe, actionable handling for credential failures, unknown models/endpoints, request-size errors, rate limits, provider outages, malformed model responses, and unsupported vision input. Provider response bodies and API keys are not surfaced to the user.
- Added project-root `.env` loading without overriding environment variables already provided by the process, updated `.env.example`, and documented Windows setup in `README.md`.
- Extended the existing document-extraction path to accept PSD files using Pillow's PSD composite and the optional Tesseract OCR executable. A PSD that cannot be decoded or OCRed returns a useful error instead of being indexed as empty content.
- Added PSD to the existing document upload control and supported-format configuration.
- Added the requested three-folder sample pack beneath `sample_documents/`, including six core project documents plus a genuine PSD composite, exactly three meeting-note DOCX files, and flowchart PNG/JPEG/WebP/two-page PDF examples.
- Added focused Groq provider regressions and PSD extraction regressions. Only Groq is selectable for Flowchart Analysis; legacy alternative provider settings are ignored by the provider factory.
- Updated provider and sample-pack documentation. Existing application modules, frontend/backend layout, API routes, workspaces, risk analysis, dashboard, and flowchart store remain in place.

## Checks that passed

| Check | Result |
| --- | --- |
| Groq/text provider, existing provider, flowchart provider/imaging/logic and document parser tests | **98 passed** in 4.12 seconds |
| Existing foundation chunking, normalization and ingestion tests | **15 passed** in 0.35 seconds |
| Python syntax compilation | **86 Python files compiled successfully** |
| Sample project document extraction (PDF, DOCX, CSV, TXT and PSD) | **All 7 files extracted**; real PSD OCR ran successfully in this environment |
| Flowchart sample validation | PNG, JPEG and WebP decoded successfully; the sample PDF contains **2 pages** |
| Organized sample folder structure | Exactly 3 requested subfolders; exactly 3 meeting-note DOCX files |
| Original runtime data preservation | **36/36** entries in the pre-edit `backend/data` SHA-256 manifest verified unchanged |
| Original ZIP inventory comparison | No original files missing; 15 original files modified and 17 added files (including this report); no source files were deleted |
| Secret/build-artifact hygiene | No real `.env`, `.venv`, `node_modules`, compiled Python caches, or frontend build output included in the working deliverable tree |

Exact test commands executed in this runner (Linux shell):

```bash
PYTHONPATH=backend python -m pytest backend/tests/test_providers.py backend/tests/test_groq_providers.py backend/tests/test_flowchart_provider.py backend/tests/test_flowchart_imaging.py backend/tests/test_flowchart_logic.py backend/tests/test_text.py -q --tb=short
python -m pytest tests/test_chunking.py tests/test_normalization.py tests/test_ingestion.py -q --tb=short
```

PowerShell equivalent for reproducing the same two test groups on Windows:

```powershell
$env:PYTHONPATH = "backend"
python -m pytest backend/tests/test_providers.py backend/tests/test_groq_providers.py backend/tests/test_flowchart_provider.py backend/tests/test_flowchart_imaging.py backend/tests/test_flowchart_logic.py backend/tests/test_text.py -q --tb=short
python -m pytest tests/test_chunking.py tests/test_normalization.py tests/test_ingestion.py -q --tb=short
```

The sample-pack generator is `scripts/create_organized_sample_pack.py`. It only writes the organized demo folders; it does not reset or change runtime data.

## Checks blocked in this environment

- **Full backend suite:** collection is blocked because `chromadb` is not installed in this runner. Installing project dependencies could not complete because package-index DNS/network access failed. Therefore the complete FastAPI application/integration suite was not verified here.
- **Frontend tests and production build:** the frontend dependency installation could not complete with the offline npm cache (`ENOTCACHED`, missing `yallist` package). Consequently Vitest, TypeScript project validation and Vite production build were not run.
- **Live Groq calls:** no usable personal `GROQ_API_KEY` was available, so the report does not claim live authentication or model invocation. Groq request/configuration/error handling was tested with mocked HTTP transports.
- **Browser/UI and restart persistence smoke tests:** these require the complete dependencies and a running application, and were not run in this runner.

These are environment limitations, not successful test results. See `README.md` for the supported Windows setup, live verification, and troubleshooting steps.

## Preserved data and compatibility

The original `backend/data/` files were checked against their pre-edit SHA-256 hashes and were unchanged. The project’s existing compatibility fixtures under `sample_documents/` root, `samples/`, `validation_samples/`, `sample_meeting_notes_corrected/`, `sample_flowcharts/`, and `data/sample_documents/` were retained because existing tests and demonstrations reference them. The new organized pack lives in the three requested subfolders; it is not automatically seeded into a workspace.

## Live verification on Windows

1. Extract the ZIP and open its root folder in VS Code.
2. Follow the PowerShell commands in `README.md` to create `.venv`, install `backend/requirements-windows-py311.txt`, and run `npm.cmd ci` from `frontend/`.
3. Create `.env` from `.env.example` only if one does not already exist. Set `GROQ_API_KEY` privately, keep the documented model IDs (or select models enabled for your Groq account), and restart the backend.
4. Confirm `/api/health`, `/api/agents/status`, and `/api/flowcharts/status`; these endpoints report configuration readiness, not proof of live provider connectivity.
5. Upload one of the files under `sample_documents/01_Sample_Documents/`, run the existing risk/delivery analysis, then upload flowchart examples on the Flowchart Analysis page. The first real analysis request verifies live credentials, model access and provider capabilities.
6. For PSD document OCR only, install Tesseract OCR and ensure `tesseract.exe` is on `PATH`. Other supported document formats do not require Tesseract.
