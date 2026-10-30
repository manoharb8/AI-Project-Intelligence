# Milestone 2 review demo

Milestone 1 is approved. This demo extends the same application with three independent agents and stops for Milestone 2 review.

## Start the application

Use the normal `AI-Project-Intelligence/` directory directly. It contains all backend and frontend source files, tests, configuration, and samples. No generator or decoding step is needed. Install dependencies and launch both terminals using the README commands.

- Local app: http://127.0.0.1:5173
- API docs: http://127.0.0.1:8000/docs
- Provider status: http://127.0.0.1:8000/api/agents/status

These URLs work on the computer running the servers. No public Python app is hosted here. Default analysis uses explicitly labeled local extraction, not a generative LLM.

## Quick walkthrough

1. Upload the four original documents in `samples/` once. Confirm 4 indexed documents and 17 passages in Knowledge Base. If reusing an existing Milestone 1 store, do not re-upload just to run agents.
2. Open Scope & Deliverables and run the default focus. Inspect project goals, deliverables, September milestones, and responsibilities. Expand a source reference to see its passage and chunk ID.
3. Open Risk & Delivery. Inspect the schedule delay, pending contract/approval dependencies, and delivery challenges. The unconfirmed revised delivery date must remain uncertain. Dates in source are not automatically forecast dates.
4. Open Blockers & Actions. Inspect pending retention decisions and the unavailable staging server. Ravi's assigned action has a stated deadline. The retention-review action has no recorded owner or deadline; both must show "Not stated".
5. Try an unrelated focus such as `How do I bake a chocolate cake?`. Expect insufficient information.
6. Run an agent with an empty knowledge base. The page explains that documents must be uploaded first; direct API calls return insufficient information.
7. Stop and restart the backend using the same `DATA_DIR`. Document knowledge remains indexed and the agents can run again. Agent analysis results are computed per request and are not stored as a separate database.

## Sample agent queries

| Agent | Query | Expected behavior |
| --- | --- | --- |
| Scope | Review project goals, milestones, timelines, responsibilities, and deliverables. | Structured category groups with source quotes and dates/owners where recognized |
| Risk | Review schedule risks, dependency gaps, delivery challenges, and the stated delivery forecast. | Documented delay and dependency evidence; no invented probability or revised date |
| Blockers | Review meeting notes and sprint updates for pending decisions, unresolved issues, and action items. | Decisions, unresolved issues, and actions with null-safe owner/date/status fields |
| Any | Review the uploaded project documents. | Run the agent's targeted retrieval facets across project evidence |
| Any | How do I bake a chocolate cake? | Explicit insufficient information on the supplied corpus |

## Per-format validation samples

`validation_samples/` contains equivalent agent-validation content in PDF, DOCX, CSV, and TXT. All three agents were tested against each format independently (12 combinations). For a manual check, use a fresh temporary data directory and upload just one of these files, then run all three agents.

Expected facts include: Priya owns the API, the prototype is scheduled for 20 September 2026, the integration timeline is 27 September, staging access is unavailable, Ravi has an action due 18 September, the retention-review owner/date are unknown, and no revised delivery date is confirmed. The files are fictional controlled fixtures.

## Runtime choices and limits

Local extraction is transparent, deterministic, and working; it can miss indirect phrasing and complex assignments. The LLM adapter is configurable but no live provider was configured for this validation. Follow `docs/setup.md` to connect your own compatible endpoint. The interface clearly distinguishes the selected mode. A failed LLM call does not silently fall back.

Every finding must pass evidence-ID and exact-quote validation. This verifies traceability within retrieved text, not the truth of the underlying documents or full semantic entailment. Category and field extraction are conservative. A missing category means not found in this run's bounded evidence, not proven absent from the whole knowledge base.

No OCR, health score, chatbot, documentation generator, fabricated delivery probability, or future milestone features are included.

## Approval gate

After reviewing the demo and limitations, send:

`MILESTONE 2 APPROVED`

Only then will final cleanup, final verification, and final ZIP creation begin. GitHub publishing requires a separate explicit request.
