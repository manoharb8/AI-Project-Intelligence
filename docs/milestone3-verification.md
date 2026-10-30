# Milestone 3 verification report

Verified on 25 September 2026 in Linux with Python 3.12.14, Node.js 24.19.0, Vite 6.4.3 and Vitest 3.2.7. Default local extractive mode was used with actual WordLlama `l2_supercat` 256 and actual ChromaDB. No external API key was required and no live external model was tested.

## Executed checks

| Check | Result |
| --- | --- |
| Full `python -m pytest -q` from repository root | **228 passed**, 0 failures, 0 skips, 2 dependency deprecation warnings; 30.97 seconds |
| Existing M1/M2 backend regression cases | **129 passed**, original test files unchanged |
| New M3 backend cases | **59 passed** |
| Older M1 root-level regression cases | **38 passed**, original tests and six fixtures unchanged; missing import adapters added |
| Real-server application tests | **2 passed**: existing M2 flow plus new M3 flow, included in 228 |
| `npm test -- --reporter=dot` | **48 passed**: 34 existing and 14 new M3 interaction cases |
| `npm run build` | **Passed**, TypeScript check plus Vite production build |
| `python scripts/smoke_m3.py --output docs/milestone3-live-verification.json` | **Passed** against actual FastAPI and Vite proxy, temporary knowledge base |
| PDF/DOCX/CSV/TXT validation | **Passed**: each format independently exercised through all three M3 modules, plus mixed-source original samples |
| Rendered browser visual verification | **Not completed**: browser environment rejected application preview access |
| Native Windows run / live external provider | **Not performed** |

The Python counts above are a breakdown of 228, not additional tests to add to that total. Existing historical milestone counts in old documentation are not rewritten. The two warnings concern Starlette/httpx compatibility and an anyio deprecated alias; no tests were skipped or dependencies changed to suppress them.

## What the tests establish

Documentation tests cover explicit and partial user stories, literal field spans, supported acceptance criteria, risk fields, action lists, duplicate statements, exact evidence, unknown owner/date fields, empty/unrelated content and instruction-like source rejection.

Health tests independently calculate the weighted result, verify half-up rounding, scope categories, severity penalties, blocker floors, explicit zero concerns, no-evidence states, missing timeline information, contradictory evidence, resolved concerns, deduplication and stable results across repeated/reordered inputs. Missing evidence never becomes a healthy score.

Assistant tests check the required on-track, risk, blocking and deliverable questions against actual source content; also actions, dependencies, health and attention. Unsupported budgets, delivery probabilities, unrelated topics and nonexistent named subjects return insufficient evidence. Follow-ups retrieve fresh facts, ignore fabricated assistant history, and clarify ambiguous references. Altered/unretrieved provider facts are rejected. Input validation and provider unavailability return appropriate errors. The optional provider path is exercised through mocked HTTP responses; this is not live model validation.

Frontend tests cover explicit actions with no automatic dashboard runs, missing fields, generation timestamps, keyboard tabs, exact source quotes, per-route draft/result/filter retention, duplicate submission locks, preserved results on errors, retry, bounded chat history, cancellation and stale response rejection, post-upload staleness, disabled states and provider recovery. Existing file queue and mobile navigation focus/backdrop/Escape tests continue to pass.

## Actual live walkthrough

All ten frontend paths returned HTML through Vite. FastAPI started successfully. The script uploaded the original `samples/` into an isolated temporary database, retrieved evidence, exercised the original three agents, generated documentation, assessed health, and asked ten assistant questions.

| Observed result | Value |
| --- | --- |
| Indexed sample documents | 4 |
| Traceable passages | 17 |
| Generated user stories | 2 partial drafts |
| Risk-register entries | 8 unique statements |
| Action items | 3 |
| Scope clarity / timeline risk / blocker health | 100 / 100 / 20 |
| Overall evidence health | 45/100, Review needed; partial retrieval coverage |
| Supported assistant questions | 8 returned source-grounded or derived-health results |
| Unsupported questions | 2 returned insufficient evidence |

The retention-policy action retained null owner/date. Sources for documentation included all four formats; the risk answer cited TXT/DOCX/CSV and the deliverable answer cited the proposal PDF. The assistant's health score matched the dedicated endpoint. References were checked against returned source passages. These values are recorded sample observations, not inserted application data. See [the actual API report](milestone3-live-verification.json).

## Compatibility issue found and resolved

The supplied project included older root-level tests importing an absent `rag_pipeline` package. The initial full test collection therefore failed even though all 129 current backend baseline tests passed. New compatibility modules restore the historical import surface by using the existing extractor, normalizer, chunking constants, WordLlama and Chroma. Their whole-document text interface remains separate from the application's unchanged source-unit ingestion API. No original test, expected value, sample document or retrieval threshold was changed.

A sequential live-test port preflight also encountered TCP TIME_WAIT after the unchanged M2 smoke test. The new M3 preflight permits socket reuse of closed connections on POSIX while still rejecting an active listener. No unknown processes are killed and the application ports remain 8000/5173.

The old M2 smoke script writes its historical JSON report. After verification, that report was restored and verified against the pre-change SHA-256; the new live report is stored separately. Original source-preservation checks and added/modified paths are recorded in [the change inventory](milestone3-changes.md).

## Frontend design review status

Implemented shared navy/amber styling, polished typography/surfaces, new Overview entry points, documentation review tabs and lists, meaningful health indicators, evidence details and a session-based assistant. CSS includes layouts for narrow, tablet and desktop screens; body text and supporting labels were reviewed in source for readability, with minimum 12px M3 metadata and generally 14px content. Existing focus indicators and reduced-motion support remain.

The preview runtime could not execute Python, so a private visual harness was prepared using recorded actual API responses. The cloud browser then rejected the application page itself. It was not bypassed. Consequently **360px, 768px, 1024px and 1440px rendered layout checks, screenshot comparison, browser console checks, live keyboard/assistive-technology review and computed contrast verification remain unverified**. Component tests do not substitute for those checks. The private harness and recordings used for preview configuration are not part of application code.

## Remaining practical limitations

- The default assistant is conservative English extractive Q&A, with exact quotations and limited follow-ups. Indirect phrasing, complex coreference and unsupported questions may return insufficient evidence.
- User stories require explicit requirement language; unknown benefits/criteria remain unknown. Documentation is a review draft, not an inferred set of new commitments.
- Health scores use bounded evidence and a transparent chosen formula. Different descriptions of one incident may count separately. A score is not a delivery probability or independent assessment of the real project.
- Grounding verifies source attribution and literal spans, not the truth or freshness of uploaded documents. Conflicting zero-concern/positive-concern evidence prevents the relevant score.
- Optional provider network calls were mocked; no paid/live external provider was configured. Native Windows execution remains to be checked by the user on the target PC; the existing Python 3.11 Windows requirements were preserved.
- The app remains a local single-user, single-backend-process application. No authentication, hosting, database migration, document deletion endpoint or unrelated integration was introduced.

No ZIP was created and nothing was pushed to GitHub. Source delivery excludes virtual environments, node_modules, build outputs, caches, secrets and runtime databases; existing sample source documents remain included.
