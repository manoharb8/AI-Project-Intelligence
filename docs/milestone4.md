# Milestone 4 — Final product release

AI Project Intelligence & Risk Advisor remains one unified application. This release adds a real-data Project Insights & Risk Summary dashboard, improves incremental-upload feedback, and refines the shared presentation. The earlier milestone implementation and historical reports are preserved.

## Requirement mapping

| M4 requirement | Implementation | Verification |
| --- | --- | --- |
| Dashboard consolidating scope, health, risks and actions | Existing `/dashboard` route; `frontend/src/dashboard/ProjectInsights.tsx` | React interaction tests; actual API outputs in backend integration tests |
| Incremental updates | Existing append-only upload service; session content-identity check; source revision invalidation | Original document IDs/passages retained; new content retrieved and used by M3; failed uploads preserve the index |
| End-to-end validation | Existing M1/M2/M3 suites plus M4 incremental and dashboard coverage | See `milestone4-verification.md` for executed checks and limitations |
| Technical documentation, project report and final demo | This document, `final-project-report.md`, `final-demo.md` | Release documents included with complete source |

The milestone brief allocates weeks 7–8 and approximately 10 hours. Those are planning values, not a claim about actual time spent or approval.

## Dashboard architecture

The Overview route activates the existing default Project Briefing resources in `IntelligenceContext`. The same session cache serves Overview, Documentation Studio, Project Health and Project Assistant. There is no new API or retrieval pipeline.

| Panel | Existing source |
| --- | --- |
| Source documents, indexed sources, traceable passages | `GET /api/knowledge-base` |
| Goal, deliverables and five scope signals | `POST /api/project-health/assess` → scope dimension references |
| Overall health and dimension bars | The same health response; values, weights, interpretation and calculation returned by the server |
| Risk entries and action items | `POST /api/documentation/generate` |
| Documented delivery outlook | `POST /api/assistant/query`, internal default question “Are we on track?” |
| Blockers and decisions | The same assistant endpoint, internal default question “What is blocking the project?” |

The M3 services compose the approved M2 agents. A cache miss invokes those services; the UI does not pretend it reused a separate manually run M2 result. Conversational history is empty for internal briefing requests. No artificial user messages are inserted.

### Automatic execution and freshness

1. The active Overview/intelligence view waits for source readiness, an available provider, successful source-status loading, and the end of uploads/indexing.
2. A 350 ms settle interval prevents transient readiness changes from repeatedly starting work.
3. Each resource is keyed by its review focus and current source revision. In-flight tokens prevent duplicate calls, including Strict Mode effects.
4. Completed data remains in memory across route visits. Custom review focuses remain separate from the broad default briefing.
5. Starting indexing invalidates old request tokens. Changes in indexed document IDs or passage counts advance the session revision.
6. Active intelligence refreshes once ready; inactive views refresh on their next visit. Previous results remain visible with a stale label.
7. A late response from an older token/revision cannot replace current results. Failure retains useful results; explicit Retry retries only that resource. There is no automatic retry loop or intelligence polling.
8. Refresh insights explicitly reruns the four dashboard resources. Optional external providers can therefore incur calls; local extractive mode requires no key.

Evidence Search and the three M2 analysis screens still run manually. The pre-existing upload-only source-status polling remains restricted to an actual upload operation.

## Incremental source updates

The existing upload endpoint and Chroma storage already append new documents without resetting earlier content. M4 preserves that backend behavior and adds SHA-256 content identity at the frontend boundary:

- Format plus file bytes identifies an exact duplicate, independent of its filename.
- Successful indexed identities are held only in shared session memory, associated with the returned document IDs.
- Renamed copies and exact duplicates in the same batch are skipped with visible filenames and an explanation.
- A same-name/same-size file with changed bytes is a valid new source. Existing files are not overwritten or silently superseded.
- Failed uploads are not recorded as successfully indexed. Unsupported files and size/count checks still use the existing queue validation.
- Checking identities pauses automatic work but does not invalidate good cached results. If every file is skipped, no source version changes and no re-analysis is needed.
- When secure browser hashing is unavailable or fails, files remain uploadable; the UI does not guess equality from filename/size.
- Hashes, document text, evidence and analysis results are not written to localStorage or IndexedDB.

**Boundary:** duplicate prevention covers successful uploads in the current app session and the current batch. The unchanged API exposes no stored content fingerprint, so a fresh browser session cannot deduplicate against the entire existing database. Direct API uploads retain their original append behavior. No claim of global deduplication is made.

## Presentation and interpretation

The interface uses deep navy navigation, off-white workspace, white surfaces, restrained blue/amber accents and the existing sans-serif stack. Sidebar order, all ten routes, attribution and old controls are preserved. Shared styling refines buttons, tables, uploads, tabs, notices, evidence disclosures and the conversational workspace.

The dashboard makes source statements prominent and uses interactive source-category/status filters. Counts describe **returned entries or source statements**, not verified unique real-world incidents. No unsupported priority ranking, trends, completion rates, probabilities or deadlines are created.

Health graphics use actual numeric values and expose them as text. Timeline risk explicitly reads “Higher means more risk”; scope and blocker health read “Higher is better.” Unknown dimensions remain unknown and an unavailable overall score is not drawn as a healthy zero. Links lead to existing analysis pages or the exact calculation/evidence disclosures.

Page and result reveals, hover elevation, score/bar transitions and status disclosures are short and state-driven. There are no fake progress percentages. Reduced-motion preferences disable animations and transitions. The mobile menu retains focus trapping, Escape/backdrop dismissal, focus restoration and hidden-menu keyboard exclusion. The new status popover supports expanded-state attributes, Escape and outside-click dismissal.

## Preserved boundaries

No files under `backend/app/` changed. M1/M2/M3 API schemas, prompts, grounding validation, provider abstraction, health formula and retrieval behavior are byte-identical to the supplied baseline. WordLlama `l2_supercat` 256, persistent Chroma, 180-word chunks and 30-word overlap remain unchanged. No application dependency was added. Historical files under `docs/` were retained byte-for-byte; final-release documents are additive.

## Remaining limitations

- Local extractive analysis uses deterministic English rules and retrieved evidence; it is not an unrestricted generative model or complete audit of every source statement.
- Conflicting or outdated source records are not automatically reconciled or replaced. A newer upload adds evidence; it does not delete an older statement.
- Source-version detection follows the existing document IDs and passage counts. It cannot detect out-of-band edits that preserve both; the approved upload workflow creates new IDs.
- Browser reload clears frontend caches and upload hashes, while the backend index persists.
- Optional external-provider integration remains available. No live paid provider was used in this release validation.
- Desktop/mobile visual rendering and native Windows execution remain unverified in this environment. See the verification report.
