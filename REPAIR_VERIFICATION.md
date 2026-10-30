# Provider Separation Repair — Verification Report

## Scope of repair

This repair is based on the newer uploaded project. The older uploaded project was used as the reference for the normal-project provider behavior; its whole source tree and database were not copied over the newer project.

### Root cause established from the source comparison

- The older project selected `ExtractiveProvider` by default (`LLM_PROVIDER` defaulted to `extractive`).
- The newer `.env.example` selected `LLM_PROVIDER=groq`, and its `build_provider()` selected Groq for the normal agents when that setting was present.
- The normal agents and intelligence routes share `app.state.provider`, so Groq text-provider failures propagated to Scope, Risk, and Blockers as service errors.
- The risk matrix UI/model files and risk-rating logic compared between the two archives were unchanged. The missing matrix results were consistent with normal risk analysis failing before producing data, not with the matrix component being removed.

The supplied server log showed successful document upload/indexing, followed by Groq `429` and `400` responses and `503` responses from normal project-analysis endpoints. The `400` response body was not included in the log screenshot, so its precise provider-side cause is not established here.

## Changes made

1. Normal project analysis is now hard-wired to the original local `ExtractiveProvider`. The normal provider factory ignores legacy text-provider environment settings and cannot issue Groq or generic text API calls.
2. Flowchart Analysis is the only external-provider path and now selects Groq only. Alternative provider selection is rejected; Gemini, OpenRouter, Anthropic, and arbitrary OpenAI-compatible vision provider configurations are not activated.
3. `.env.example`, README, setup guide, architecture notes, and flowchart guide were updated to document this separation.
4. Updated the flowchart API status schema and frontend status type to the supported `groq` / `unavailable` states.
5. Added `VISION_MAX_TOKENS` to the actual Groq vision chat-completions request. The environment setting now affects the requested output-token limit.
6. Updated regression tests to verify that normal analysis remains local even when legacy Groq text settings or keys are present, and that the Flowchart Analysis factory selects Groq only.
7. Preserved the newer ZIP's backend data directory, including its workspace registry, per-workspace Chroma stores, document manifests, and saved workspace state.

## Verification performed in this environment

- Python syntax compilation (`compileall`): passed for backend app and tests.
- Focused backend regression selection: **146 passed, 2 deselected**. The two deselected tests require integration execution that imports `chromadb`.
- Tests for the normal provider factory: confirm it always returns local extractive mode even when `LLM_PROVIDER=groq`, `GROQ_API_KEY`, or legacy compatible text-provider settings are supplied.
- Flowchart provider tests: confirm Groq-only provider selection, missing-key handling, HTTP error sanitization, bounded JSON-mode retry, timeout/connection handling, and max-token request configuration.
- Archive integrity: original input archive passed `ZipFile.testzip()`; the final archive is checked separately at packaging.
- Newer workspace data: copied from the newer uploaded archive without editing the data files.

## Checks not completed

- Full backend integration suite and live FastAPI startup could not be run because `chromadb` is not installed in this environment. Attempting installation failed because package-index DNS/network access was unavailable.
- Frontend tests and production build could not be run because `node_modules` is absent and `npm ci --offline` failed because the npm cache did not contain the `yallist` package.
- No live Groq request was made; this environment has no user-provided Groq credential. The Groq call path was tested with mocked HTTP responses.
- Browser-based end-to-end verification was not available.

## Local verification still required

1. Create `.env` from `.env.example` and set only `GROQ_API_KEY` for Flowchart Analysis.
2. Leave `LLM_PROVIDER=extractive` and `VISION_PROVIDER=groq`.
3. Install backend and frontend dependencies using the README commands.
4. Start the backend and frontend, upload one ordinary document, and verify `/api/agents/status` reports `Local extractive analysis`.
5. Run Scope, Risk, Blockers, Documentation Studio, and Project Health; these should work without using Groq.
6. Upload one flowchart and verify that only that explicit flowchart request contacts Groq.

This report distinguishes tested code paths from environment-limited checks; it does not claim a complete live application verification.
