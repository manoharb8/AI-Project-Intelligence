# Milestone 3 change inventory

The existing application was extended in place. This source handoff is a clean copy of that unified repository, not a separate M3 application.

## Preservation verified

SHA-256 comparison with the pre-change source manifest confirms that all original M1/M2 backend agent, provider, grounding, schema, ingestion, chunking, embedding, retrieval and configuration files are unchanged. Original backend tests, root historical tests, frontend test files, original samples, validation samples and historical milestone documents are unchanged. The six older sample documents were also compared byte-for-byte with the uploaded archive.

The old live smoke test rewrites its M2 report; those original bytes were restored after running it. `docs/milestone2-live-verification.json` matches its original hash. No M1/M2 API contract was rewritten and no test was removed.

## Existing files modified

| File | Change |
| --- | --- |
| `PROJECT_FILES.md` | Accurate unified source inventory. |
| `README.md` | Current setup/status, M3 links, validation and limitations; historical milestone files preserved. |
| `backend/app/main.py` | Register additive M3 router and version 0.3.0. |
| `frontend/src/App.tsx` | Three new routes/navigation destinations and shared M3 state provider. |
| `frontend/src/SessionContext.tsx` | Export the existing request-state hook for reuse; behavior unchanged. |
| `frontend/src/api.ts` | Export the existing typed request helper; M1/M2 requests unchanged. |
| `frontend/src/components/UI.tsx` | Add icons for new page titles. |
| `frontend/src/main.tsx` | Load shared M3 design styles. |
| `frontend/src/pages/Overview.tsx` | Add M3 entry points backed only by completed session results. |

## Files added

- `backend/app/agents/documentation.py`
- `backend/app/api/intelligence.py`
- `backend/app/intelligence/__init__.py`
- `backend/app/intelligence/evidence.py`
- `backend/app/intelligence/schemas.py`
- `backend/app/services/assistant.py`
- `backend/app/services/project_health.py`
- `backend/tests/test_m3_documentation.py`
- `backend/tests/test_m3_health.py`
- `backend/tests/test_m3_integration.py`
- `docs/health-scoring.md`
- `docs/milestone3-changes.md`
- `docs/milestone3-demo.md`
- `docs/milestone3-live-verification.json`
- `docs/milestone3-verification-results.json`
- `docs/milestone3-verification.md`
- `docs/milestone3.md`
- `frontend/src/Intelligence.test.tsx`
- `frontend/src/intelligence/IntelligenceContext.tsx`
- `frontend/src/intelligence/OverviewIntelligence.tsx`
- `frontend/src/intelligence/Shared.tsx`
- `frontend/src/intelligence/api.ts`
- `frontend/src/intelligence/intelligence.css`
- `frontend/src/intelligence/types.ts`
- `frontend/src/pages/Assistant.tsx`
- `frontend/src/pages/Documentation.tsx`
- `frontend/src/pages/ProjectHealth.tsx`
- `rag_pipeline/__init__.py`
- `rag_pipeline/chunking.py`
- `rag_pipeline/embeddings.py`
- `rag_pipeline/ingestion.py`
- `rag_pipeline/models.py`
- `rag_pipeline/normalization.py`
- `rag_pipeline/pipeline.py`
- `rag_pipeline/retrieval.py`
- `rag_pipeline/vector_store.py`
- `scripts/smoke_m3.py`
- `tests/test_m3_live_application.py`

The `rag_pipeline/` adapters restore imports required by frozen historical tests that arrived without their original package. The running application does not import them; their extraction/embedding utilities delegate to existing services. No parallel application, external service or alternate embedding system was added.

## Delivery hygiene

The source contains actual individual files and all existing sample documents. No source generator, ZIP, virtual environment, node_modules, build output, cache, runtime Chroma database, real environment file or credentials are included. No GitHub push was performed. Dependency manifests and lockfiles are unchanged.

See [verification](milestone3-verification.md) and [demo](milestone3-demo.md). Browser rendered-layout checks and native Windows execution remain unverified; this inventory does not imply those checks passed.
