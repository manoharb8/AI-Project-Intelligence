# AI Project Intelligence & Risk Advisor — Final project report

Infosys Springboard internship project • Unified Milestones 1–4

## Purpose and problem

Project knowledge is distributed across proposals, meeting notes, progress updates and task lists. Reading them separately makes it difficult to connect scope, dependencies, risks and ownership. This application organizes uploaded sources into a searchable knowledge base and presents evidence-backed project intelligence. Its central constraint is traceability: important statements must connect to source evidence, and missing details must remain unknown.

## Milestone progression

| Milestone | Role in the unified application |
| --- | --- |
| M1 | PDF/DOCX/CSV/TXT ingestion, text processing, fixed chunking, WordLlama embeddings, persistent Chroma storage and semantic evidence retrieval |
| M2 | Scope & Deliverables, Risk & Delivery, and Blockers & Actions agents; structured outputs, exact quotations, evidence IDs and uncertainty |
| M3 | Documentation Studio, deterministic Project Health and RAG-powered conversational assistant; existing automatic Project Briefing and session cache |
| M4 | Consolidated real-data Project Insights & Risk Summary on Overview, incremental-upload safeguards and feedback, shared premium UI polish, integrated validation and final-release documentation |

M1/M2 approval is historical context supplied for the project. This report does not invent M4 mentor approval, meeting records, dates, owners, hours or achievements. Earlier milestone reports remain unchanged, including any historical UI references.

## System architecture

The React/TypeScript application uses Vite, Tailwind CSS, React Router and Lucide. FastAPI/Pydantic expose validated structured endpoints. WordLlama `l2_supercat` provides 256-dimensional embeddings, and ChromaDB persists the vector collection. Chunking remains fixed at 180 words with 30-word overlap.

Uploaded files are parsed into source units, normalized and chunked. Each passage retains provenance. Semantic retrieval supplies evidence to the existing provider abstraction and agent grounding validators. M2 produces structured source-backed findings. M3 composes those agents into documentation, health and conversational results. M4 coordinates and presents the resulting contracts without replacing any analysis algorithm.

The default runtime is local deterministic/extractive analysis and works without a live external LLM key. The optional compatible provider adapter remains configurable. The development assistant is not the application's runtime model.

## Functional capabilities

**Sources and search:** Upload supported files with the existing 10 MB/file and 20-file queue limits. Review indexing status and failures, inspect knowledge-base readiness, and search exact source passages. Similarity is retrieval similarity, not factual confidence.

**Project analysis:** Manually run scope, risk/delivery and blocker/action analyses. Findings show their category, source evidence and stated metadata. Delivery outlook is constrained by project statements; unsupported revised dates and probabilities are not created.

**Documentation:** Generate/review source-backed user-story drafts, risk-register entries and structured actions. Missing roles, benefits, owners, dates and other unsupported fields remain “Not stated.” Documentation and health open automatically when prerequisites are met, while editable focus and explicit refresh remain available.

**Health:** The unchanged `evidence-health-v1` model combines scope clarity (40%), timeline health (35%) and blocker health (25%). Scope categories contribute according to evidence clarity. Timeline health is the complement of documented timeline risk; unresolved blocker statements affect blocker health. Any unknown required dimension prevents a numeric overall score. The exact formulas and interpretation are preserved in `health-scoring.md` and returned by the API. The score is an explainable evidence heuristic, not a delivery probability.

**Assistant:** A default Project Briefing presents supported scope, concerns, blockers, actions and health without requiring typed questions. Optional conversation below it uses the same RAG services. Insufficient evidence is reported explicitly. Earlier conversation is context for questions, not authority for new project facts.

**Final dashboard:** Overview consolidates the existing results into a scope lead panel, real health ring/dimensions, risk and action workspaces, delivery and blocker summaries, scope signals, evidence gaps and a “Why this score?” section. Filenames, exact quotations, timestamps and technical references remain reviewable. Filters operate only on returned data.

## Incremental data and reliability

New uploads preserve existing documents and vectors. Frontend hashes skip exact content already successfully uploaded during the current session and exact copies in one batch. Changed content with the same name is accepted. Older source records remain available, so users can inspect conflicting evidence instead of receiving silently overwritten history.

Source revisions invalidate earlier intelligence. Active views refresh when indexing settles; cached results survive navigation and remain visible during refresh/failure. Tokens reject late obsolete responses. Retry is explicit and bounded. Inactive views do not poll or repeatedly call optional external providers.

## UX and accessibility

A shared navy/off-white/white visual system, blue/amber accents, soft depth and consistent type/spacing organizes every route. Important data has visual prominence without fabricated analytics. Responsive CSS handles narrow screens, long content and intentional table scrolling. Keyboard focus, semantic controls, readable labels, mobile dismissal/focus behavior and reduced-motion support remain part of the design. Browser-rendered layout acceptance is still an outstanding check, as disclosed in the release verification.

## Validation approach

Regression coverage preserves the older ingestion, retrieval, agent, grounding, health and conversation expectations. New tests cover dashboard rendering/filtering, exact source statuses and unknowns, cache activation, status popover focus, session duplicate handling, changed content, failed upload retry and real incremental API ingestion. Real WordLlama/Chroma tests use temporary stores and the existing four-format samples. Existing live tests start FastAPI and Vite and exercise their proxy boundary.

Executed results and environmental qualifications are listed in `milestone4-verification.md`. No mocked frontend fixture is imported into the running application.

## Outcome and limits

The final source extends the approved system into a coherent project-intelligence workspace while preserving its evidence-based meanings and backend contracts. It is suitable for demonstrating document-to-evidence-to-analysis-to-intelligence flow with the existing controlled sample project. It does not claim autonomous project management, verified risk prioritization, guaranteed prediction accuracy or universal document understanding.

Submission materials include complete source, tests, setup instructions, architecture details, final demo steps, release verification and an exact file-change manifest. No secrets, virtual environments, runtime databases, node_modules or build caches are included in the source ZIP.
