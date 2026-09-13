# Milestone 2 — implemented, awaiting approval

Milestone 2 adds exactly three evidence-grounded agents and cross-format validation to the approved application.

| Objective | Implementation | Page | Endpoint |
| --- | --- | --- | --- |
| Scope and deliverables | `app/agents/scope_deliverables.py` | `ScopeDeliverables.tsx` | `POST /api/agents/scope` |
| Risk and delivery | `app/agents/risk_forecast.py` | `RiskDelivery.tsx` | `POST /api/agents/risk` |
| Blockers and actions | `app/agents/blockers_actions.py` | `BlockersActions.tsx` | `POST /api/agents/blockers` |
| Validate PDF, DOCX, CSV, TXT | Four fixtures in `validation_samples/`; independent agent-format tests | Shared evidence display | Actual FastAPI test requests |

## Shared processing

`app/agents/base.py` runs targeted queries through the existing knowledge base and bounds selected evidence to 12 unique passages and 14,000 characters. `app/agents/schemas.py` defines requests, provider candidates, findings, coverage, and responses. `grounding.py` validates the schema, retrieved evidence IDs, complete statement segments, and category support. `extraction.py` derives owners, dates, source status, and uncertainty only from validated source quotations. `prompts.py` separates retrieved data from model instructions.

Provider abstractions live in `app/llm/base.py` and `app/llm/provider.py`. Local extractive mode is deterministic rule-based analysis with real WordLlama retrieval; it requires no API key and is clearly labeled. The optional HTTP chat-completions adapter is configurable through environment variables. It was tested with mocked transport only; no live external LLM was configured.

`app/api/agents.py` exposes three independent analysis routes plus provider status. Dedicated frontend page files share `AgentAnalysis.tsx` so loading, error, empty, missing, and expanded-evidence behavior stays consistent. The sidebar clearly separates milestones.

## Output and evidence

Scope groups goals, milestones, timelines, responsibilities, and deliverables. Risk groups schedule risks, dependency gaps, delivery challenges, and stated delivery outlook. Blocker/action results group pending decisions, unresolved issues including blockers, and action items.

Each finding references a retrieved evidence ID and exact quotation. The response evidence map retains document ID, filename, type, chunk number, source location, retrieved text, and similarity. Unknown fields are null and show “Not stated.” Coverage is known, unclear, or missing. Unsupported provider output is rejected rather than silently displayed; provider failures are explicit.

Delivery outlook is limited to explicit documented threats, delays, and forecasts. It does not calculate a delivery probability or invent a revised date. The current extractor does not synthesize unstated cross-document forecasts; indirect phrasing may be missed. Missing describes this run's selected evidence rather than proving absence from the full corpus.

## Validation and review

All three agents run independently against each of PDF, DOCX, CSV, and TXT: 12 tested combinations using real extraction, WordLlama, and Chroma. Backend tests also inject deterministic malformed, unsupported, and failing provider responses. Frontend tests cover the three pages, source display, nulls, loading, failure/retry, unavailable provider, and empty/insufficient states. The live test starts actual FastAPI and Vite processes and uses their HTTP proxy.

See `verification.md` for executed results and `demo.md` for the walkthrough. The directory itself is runnable after installing dependencies; a source generator is not required.

Milestone 1: approved. Milestone 2: awaiting the exact message `MILESTONE 2 APPROVED`. No final ZIP, GitHub push, deployment, or future milestone implementation is included.
