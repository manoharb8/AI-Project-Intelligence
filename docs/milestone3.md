# Milestone 3 — project intelligence extension

The supplied **milestone 3 risk management.docx** defines Week 5–6 (approximately 10 planned hours): documentation generation, project health scoring, conversational project intelligence, and conversational accuracy/relevance validation. The planned allocation is not a claim about actual development hours.

## Preserved foundation

M1 continues to extract PDF, DOCX, CSV and TXT, normalize source units, create 180-word chunks with 30-word overlap, embed with WordLlama `l2_supercat` 256, persist in the existing Chroma collection, and return semantic source passages. No chunk controls or second application were added.

M2 continues to run Scope & Deliverables, Risk & Delivery and Blockers & Actions with its original prompts, provider interface, Pydantic models, grounding checks, quotes, categories and API behavior. All original tests remain unchanged. Historical milestone documents and sample sources remain unchanged.

M3 introduces three additive API routes. The only existing backend application file changed is `app/main.py`, which includes the new router and updates the application version. No dependency changes were needed.

## Architecture and responsibilities

| Module | Responsibility |
| --- | --- |
| `app/intelligence/schemas.py` | Strict Pydantic request/response schemas, source references, nullable fields, health dimensions and assistant turns |
| `app/intelligence/evidence.py` | Compose existing M2 agents; reuse bounded retrieval; deduplicate statements; validate exact source references |
| `app/agents/documentation.py` | Assemble stories, risks and action lists from explicit statements |
| `app/services/project_health.py` | Calculate the documented deterministic health model |
| `app/services/assistant.py` | Resolve supported question intents and bounded follow-ups; retrieve fresh evidence; assemble source-only answers |
| `app/api/intelligence.py` | Input validation, provider readiness, structured responses and HTTP errors |
| `frontend/src/intelligence/` | Matching TypeScript types, API methods, in-memory state, shared controls/evidence, design styles |
| New page views | `/documentation`, `/project-health`, `/assistant` |

All three features call the same KnowledgeBaseService and M2 analysis/provider path. Documentation adds requirement-focused facet queries through the existing GroundedAgent retrieval helper. Health also reads retrieved negative statements such as an explicit “No current blockers.” There is no direct full-collection dump and no separate embedding or retrieval engine.

The M2 helper bounds each retrieval pass to 12 unique passages and 14,000 characters. An M3 operation can compose multiple such passes, so its combined evidence can exceed 12 passages. `evidence` contains only cited passages; `retrieved_count` reports the unique available evidence set used by documentation/health, and the largest constituent retrieval count for an assistant quotation response. It is not a count of every indexed passage inspected. The UI labels the displayed count **cited passages**. A limit flag and caveats make partial coverage explicit.

## Documentation Generation Agent

User stories contain stable IDs, a title, role, need, benefit, acceptance criteria and references. Local extraction recognizes explicit “As a …, I want …, so that …” statements, capability statements such as “will let customers submit…”, and labelled goals/objectives. A goal without a role/value becomes a partial story. Acceptance criteria must be explicitly labelled in the same requirement statement; unrelated sentences are not silently attached.

Risk entries retain the M2 risk statement and categories. Impact, likelihood, status and mitigation/recommended action are populated only from explicit labels; stated severity is taken from validated M2 extraction. The original wording remains visible. A stated delivery uncertainty can appear as a register entry with unknown fields; it is not converted into an invented forecast.

Action entries retain action/description, source-derived owner, due date, status and dependency. An unassigned retention review remains unassigned. Missing scalar fields are JSON `null` and displayed as **Not stated**; a missing criteria list is empty and shown as Not stated. No dates, values, people or commitments are fabricated.

Repeated identical wording is deduplicated, including overlapping chunks. Every generated item requires at least one evidence ID and exact quotation. Titles and populated story fields are literal spans from the quote. These are structured drafts for review, not newly proposed requirements.

## Project Health

The three dimensions are scope clarity, timeline risk and blocker health. The overall health contribution weights are 40%, 35% and 25%. Timeline risk is inverted for its health contribution. Unknown dimensions are not zero, and the overall score is unavailable unless all three dimensions can be assessed. See [the complete formula and edge cases](health-scoring.md).

The UI shows the actual score, dimension direction, counts, formula, exact evidence and generation timestamp. The ring represents the returned score only. No score is calculated automatically on the Overview page.

## Conversational assistant

1. Validate the question and at most 12 history messages.
2. Recognize a supported project intent: delivery outlook, risks, blockers, actions/owners, deliverables/goals/milestones/timelines, dependencies, attention, or health.
3. Resolve clear follow-ups using the previous user question. Ambiguous singular references request clarification. Prior assistant text never becomes evidence.
4. Retrieve fresh sources through existing M2 agents. Specific subjects must match the returned quote; unsupported budget or unrelated questions receive insufficient evidence.
5. Return a server-owned introduction and structured exact quotations, not unverified model prose. Health questions call the same deterministic health service as the health page.
6. Display source filename, location, exact quote, optional owner/date/status/severity, evidence identifiers and generation time.

Grounding labels are `source_quotations`, `derived_health_assessment`, or `insufficient_evidence`. They are not confidence probabilities. “Biggest risks” lists documented concerns and any stated severity without inventing a ranking. “Are we on track?” presents the stated outlook without making an independent date/probability prediction.

## Provider behavior

Default `LLM_PROVIDER=extractive` needs no API key and uses real WordLlama/Chroma retrieval plus deterministic English rules. M3 also works through the existing optional compatible model adapter: that provider selects M2 source statements; M3 still derives fields, calculations and responses on the server. No new proprietary provider, prompt contract, external key or silent fallback was introduced. Optional provider behavior was tested with mocked HTTP responses, not a live external service.

## API contracts

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/documentation/generate` | `{ "query": "Review the uploaded project documents." }`; query may be omitted | `DocumentationResult`: user_stories, risks, action_items, evidence, status and metadata |
| `POST /api/project-health/assess` | Same query contract | `HealthResult`: overall_score, dimensions, assessed_dimensions, methodology, evidence and metadata |
| `POST /api/assistant/query` | `{ "question": "Are we on track?", "history": [] }` | `AssistantResult`: answer introduction, statements, resolved_question, grounding, optional health, evidence and metadata |

Query length: 2–500 characters after validation; question: 2–1,000. History permits user/assistant messages only, at most 12, each 1–2,000 characters. Unknown request fields are rejected. Whitespace-only questions are rejected. Responses share status (`ok`, `partial`, `insufficient_information`), UTC `generated_at`, provider, evidence, limits and warnings.

HTTP 200 includes valid insufficient-evidence results; 422 indicates invalid input; 503 indicates unavailable/failed provider; 502 indicates evidence validation rejected the result; unexpected failures use the existing sanitized 500 handler. No unverified partial output is returned on grounding failure. FastAPI `/docs` exposes the exact models.

## Frontend integration

The original seven routes remain, with three new workspaces and Overview entry points. Navy navigation, restrained amber actions, shared typography, evidence badges, subtle shadows and responsive panels unify old and new pages. Documentation has keyboard tabs, filters and expandable evidence; health has a meaningful score ring and transparent formulas; chat has session history, source excerpts and retry/loading/unknown states.

M3 reuses the existing in-memory request-state hook and knowledge-base revision counter. Queries, filters, results and conversation survive route changes within the current session. Reload clears session results; nothing writes document content to browser storage. Uploads mark previous results stale. Requests never run just to decorate the dashboard. Duplicate actions are locked; clearing chat aborts its request and rejects late responses. Failed retries retain useful prior results.

Navigation retains Escape dismissal, backdrop, focus trapping/restoration, `aria-expanded`, and inert background behavior. CSS includes narrow-screen layouts and reduced-motion support. Component tests exercise interactions; rendered layout/contrast at 360/768/1024/1440px still needs manual browser review because the preview environment blocked page access.

## Historical regression compatibility

The supplied archive contained older `tests/test_*.py` importing `rag_pipeline`, but no matching package. A small compatibility package now exposes those historical names using the current extractor, normalizer, fixed-window helper, WordLlama and Chroma. Legacy plain-text batch calls concatenate extracted text before fixed chunking; the running application's source-unit ingestion and provenance are untouched. These adapters are not imported by the application and are not a second application. No tests or old fixture content were rewritten to pass.

## Validation and limits

See [verification](milestone3-verification.md), [actual live API results](milestone3-live-verification.json), and [demo instructions](milestone3-demo.md). Local extraction can miss indirect or unfamiliar English wording. Bounded retrieval cannot prove absence across every document. Exact quotations verify source attribution, not real-world truth. The health model counts unique statements, not verified incidents, and is a heuristic rather than a prediction.
