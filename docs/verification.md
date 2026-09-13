# Milestone 2 verification report

Executed 12 September 2026 against the unified Milestone 1 + Milestone 2 application.

## Observed results for this review

| Check | Result |
| --- | --- |
| Python backend suite | 129 passed, 0 failed |
| React component suite | 18 passed, 0 failed |
| Root live application test | 1 passed, 0 failed |
| Total automated cases | 148 passed, 0 failed |
| Milestone 1 backend regression cases | All 56 passed |
| New agent/provider backend cases | All 73 passed |
| TypeScript and production frontend build | Passed |
| Real FastAPI + Vite startup | Passed |
| Seven frontend routes via live HTTP | All HTTP 200 |
| Vite proxy to actual backend | Passed |
| Original sample upload | 4 indexed documents, 17 chunks |
| Scope Agent live endpoint | 11 findings, all scope categories represented |
| Risk Agent live endpoint | 12 findings; partial information correctly retained |
| Delivery outlook | Explicit delay/forecast statements extracted; unconfirmed date remains uncertain |
| Blocker/Action Agent live endpoint | 8 findings; missing owner/date remain null |
| PDF/DOCX/CSV/TXT agent validation | All 12 agent-format combinations passed |
| Provider abstraction and HTTP protocol | Mocked transport tests passed |
| Live external LLM | Not configured or tested |
| Browser visual test | Not performed |
| Windows/Python 3.11 binary dependency resolution | Passed using an explicit Windows target |
| Windows runtime execution | Not tested here; PowerShell commands and resolved requirements supplied |
| Public hosted application | Not available; local run instructions supplied |
| Final ZIP / GitHub push | Not performed |

The default working demo uses real WordLlama semantic retrieval and the local deterministic extraction provider. It is not a generative LLM. The interface/API/docs label the mode explicitly. A configurable LLM adapter is implemented, but mocked provider tests must not be presented as live model validation.

## Per-format agent validation

| Input format | Scope | Risk/delivery | Blockers/actions |
| --- | --- | --- | --- |
| PDF | Passed | Passed | Passed |
| DOCX | Passed | Passed | Passed |
| CSV | Passed | Passed | Passed |
| TXT | Passed | Passed | Passed |

Each combination ingests one actual controlled-format file into a fresh Chroma knowledge base, invokes its agent through FastAPI, checks all required category groups, and checks traceable source text and structured fields. The tests use real WordLlama embeddings and real ChromaDB. No format status was inferred from another format's result.

## Evidence retained

- `milestone2-backend-tests.xml`: backend JUnit report from this review, including each format/agent test name.
- `milestone2-frontend-tests.json`: React test result report from this review.
- `milestone2-live-verification.json`: actual live proxy/API requests, findings, source passages, and summary.
- `milestone2-live-tests.xml`: root live-test JUnit report, including evidence references and unknown owner/date assertions.
- `python311-windows-resolution.json`: explicit Windows/Python 3.11 dependency-resolution scope and result.
- `milestone2-build.txt`: TypeScript and Vite production-build output.
- `backend-tests.xml`, `frontend-tests.json`, `live-verification.json`: prior Milestone 1 records, retained separately.

## Commands actually executed

```text
# From backend/
python -m pytest -q --junitxml=../docs/milestone2-backend-tests.xml

# From frontend/
npm test -- --reporter=json --outputFile=../docs/milestone2-frontend-tests.json
npm run build

# From project root
python -m pytest -q tests --junitxml=docs/milestone2-live-tests.xml
```

The root live test calls `scripts/smoke_demo.py`. The smoke workflow launches both real servers in a shared execution context, uses a temporary data store, exercises uploads/retrieval/all three agents through the Vite proxy, records results, and stops the servers. It is an HTTP integration test, not visual browser automation and not a persistent hosted demo.

## Coverage details

Agent tests cover goals, milestones, timelines, responsibilities, deliverables, schedule risks, dependency gaps, delivery challenges, stated forecasts, pending decisions, unresolved issues, assigned actions, unknown owner/date, explicit uncertainty, all formats, original Milestone 1 samples, empty knowledge base, unrelated focus, uninformative retrieved content, request validation, provider status, unavailable provider, provider failure, citation rejection, fabricated owner/date text, altered or partial quotation rejection, extra output fields, missing structure, negated risk statements, instruction-like source text, field association, and bounded retrieval.

HTTP provider tests cover default mode, custom model configuration, invalid configuration, URL restrictions, request serialization, authorization-header handling with a test key, valid JSON response, HTTP errors/redirect rejection, timeout, malformed responses, response-size bound, and separation of source data from system instructions. All calls use mocked transport; no private key or live model was used.

Interface tests cover all three new routes, honest provider labels, loading/duplicate-run prevention, unknown fields, expandable source references, insufficient results, retry after failure, empty knowledge base, unavailable provider, changing agents, and edited analysis focus. The seven earlier interface tests also pass.

## Issues found and resolved

The first per-format run exposed a retrieval problem: a generic instruction to review documents did not always match the PDF text, and a combined scope query missed a short goal statement. Generic review commands now use the agent's facet queries even when the instruction text itself has no semantic hit; goal retrieval has its own focused facet. The unchanged per-format assertions then passed.

The earlier interface run exposed a test timing race: tests attempted to click Run before the asynchronous provider-readiness check had enabled it. The tests now wait for the enabled control, matching the real user flow. No assertions or product readiness checks were removed. The source-reference test now actually expands the details element and verifies that its chunk ID becomes visible.

## Known limits and interpretation

1. Local analysis uses conservative English patterns and can miss indirect wording, complex names, or dates outside supported literal forms. It is an extractive baseline.
2. Quotes and evidence IDs establish traceability, not external truth, comprehensive semantic entailment, or automatic conflict resolution. Chunks can cut sentences; source context should be reviewed.
3. Agent evidence is bounded to 12 passages/14,000 characters. Missing means not established in the selected evidence. An analysis focus is not a conversational answer request.
4. Delivery outlook copies stated risks, forecasts, and uncertainty. There is no statistical forecasting model or invented revised date/probability.
5. The optional live LLM path requires a user-configured compatible endpoint/model and further live validation. No silent fallback occurs on failure.
6. Existing Milestone 1 limitations remain: no OCR/encrypted PDFs, UTF-8 CSV/TXT, DOCX body text/tables only, single local process, no authentication or project isolation.
7. Two upstream Python deprecation warnings appeared; they did not fail tests. No browser visual, Windows, or public-hosting claim is made.

## Complete-directory handoff

The normal directory is `AI-Project-Intelligence/`, containing all individual source files. `PROJECT_FILES.md` lists the complete deliverable tree and links to each file. No generator or decoding step is needed. Local installed dependencies, build caches, and temporary test data are not source deliverables.

This revision adds dedicated ScopeDeliverables, RiskDelivery, and BlockersActions page files, clear milestone navigation groups, root live tests, milestone documentation, and Windows-specific dependency guidance. The existing Milestone 1 API, schemas, configuration, extraction/chunking, embeddings, and knowledge-base service were preserved byte-for-byte during this directory revision.

Runtime tests used Python 3.12.14 and Node.js 24.19.0 on Linux. The recommended Node.js 22 setup satisfies the supplied Vite, router, and Vitest engine requirements; it was not the runtime used here. A Windows/Python 3.11 binary-package resolution succeeded using uv with an explicit Windows target. It selected NumPy 2.4.6, WordLlama 0.4.0.post1, and ChromaDB 1.5.9. Windows execution was not performed. The Linux/Python 3.12 freeze remains a reference file, not a Windows installer.

## Approval status

Milestone 1: approved by the user.

Milestone 2: implementation and local-extraction demo ready for review, with the live-LLM limitation stated above. Awaiting `MILESTONE 2 APPROVED` before final cleanup, final verification, and final ZIP. GitHub push still requires a separate explicit request.
