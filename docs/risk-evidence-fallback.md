# Risk Priority Matrix: evidence fallback update

## Behavior

- If no returned risks can be positioned, the empty matrix and axes are replaced by an interactive evidence board headed **Position not established from source evidence**.
- Each card shows the actual risk ID, title, stated severity, original probability/impact text, and source reference. Cards preserve returned order and have equal visual weight; their placement does not imply priority, clustering, or a relationship between risks.
- Hover or keyboard focus exposes a source preview. Escape dismisses it. Opening a card reuses the existing risk detail dialog, including its exact quotations and full source references.
- If only some risks have coordinates, the existing matrix displays those records and the evidence board displays the remaining records below it. Filters do not remove unknown records from the underlying result.
- Empty results and filters remain explicitly empty. No risk records are manufactured to fill the view. Existing results remain visible during refresh and after a failed refresh.
- Light/dark styling, mobile layouts, finite entrance transitions, hover/focus feedback, and reduced-motion behavior are supported.

## Explicit rating extraction

The documentation risk register now recognizes explicit **Probability** as an alias for its existing `likelihood` field. It also captures explicitly labeled Likelihood, Impact, and Severity. Literal values are retained; no score or category is inferred from a delay, blocker, consequence, or general risk description.

The parser reads the original risk quotation and immediately following rating-only statements in the same retrieved passage. Additional statements become exact supporting source quotations with the existing evidence ID. It stops at another risk, unrelated metadata, narrative, or unsafe instruction. It does not search other passages for a rating that might belong to the risk. Ambiguous repeated quotations do not establish an association with following metadata.

Impact and severity remain separate fields. Severity is never substituted for an absent impact. Unknown values remain unknown. Conflicting explicit values produce an unknown field and a source-specific warning, with supporting quotations retained.

The matrix's existing supported scales are unchanged: its categorical labels or explicit percentage coordinates. Other literal values remain available in the evidence board rather than being converted into invented coordinates. Consequently, some explicitly stated descriptive values can still be unpositioned.

## Applying the update

Use this source update with the existing application and preserve its local configuration and runtime data. No database reset or re-upload is required. Existing cached results are not silently rewritten: use the existing **Refresh insights** action to regenerate documentation with the improved extraction. New uploads continue through the existing automatic analysis flow.

No dependencies were added. Existing setup and run instructions remain applicable.

## Scope and preservation

The patch leaves API endpoints and schemas, M2 agents and prompts, the RAG pipeline, embedding/chunking configuration, health calculations, routes, workspace isolation, stored project data, and historical milestone documents unchanged. Only documentation rating capture and matrix presentation are extended.

Modified files:

- `backend/app/agents/documentation.py`
- `frontend/src/dashboard/RiskPriorityMatrix.tsx`
- `frontend/src/dashboard/RiskPriorityMatrix.test.tsx`
- `frontend/src/dashboard/riskMatrix.css`

Added files:

- `backend/app/agents/risk_ratings.py`
- `backend/tests/test_risk_ratings.py`
- `backend/tests/test_risk_ratings_formats.py`
- `frontend/src/dashboard/RiskEvidenceBoard.tsx`
- `docs/risk-evidence-fallback.md`

All 214 original source-package files remain present. Apart from the four modified files listed above, their contents are byte-for-byte unchanged.

## Verification executed

| Check | Result |
| --- | --- |
| Full backend suite: `python -m pytest -q` | 291 passed |
| Full frontend suite: `npm test -- --reporter=dot` | 137 passed across 12 files |
| Production build: `npm run build` | TypeScript and Vite passed |
| Live browser assertions with FastAPI, WordLlama, ChromaDB, and Vite | 36 passed; no browser runtime errors |
| Automated axe WCAG 2 A/AA and 2.1 AA checks, mobile/desktop, light/dark | 4 scans; 0 reported violations |

The backend additions test explicit labels and aliases, unknown/conflicting values, literal preservation, source association, exact source quotations, unsafe continuations, and prevention of cross-risk/cross-passage rating leakage. A cross-format integration test ingests actual PDF, DOCX, TXT, and CSV files through the existing services and confirms rating extraction, source grounding, and unchanged M2/health outputs.

The live browser run used isolated temporary storage. The four original sample documents produced eight actual risk records with unknown ratings: all eight appeared in the fallback and no empty axes were drawn. An additional temporary QA document with explicit ratings verified a real positioned point alongside the remaining unpositioned records. QA documents and runtime data are excluded from the source package.

Browser checks covered 360, 768, 1024, and 1440 pixel layouts in both themes; exact quotations; focus/hover previews; Escape; dialog focus trapping/restoration; filters; reduced motion; retained results during refresh and failure; and absence of analysis calls caused by matrix inspection. Risk counts describe the current returned records, not verified unique incidents. The existing bounded retrieval behavior is unchanged.

The backend suite reported one Starlette/httpx dependency deprecation warning. It did not fail any test.

## Limits

- Conservative extraction intentionally leaves separate-passage, ambiguous, implicit, or unsupported-scale ratings unpositioned. The evidence board makes those records reviewable without inventing a position.
- Native Windows execution, an external LLM provider, and manual screen-reader use were not re-tested in this environment. Live validation used the existing local extractive mode on Linux/Chromium.
- Automated accessibility checks and keyboard verification do not establish universal accessibility conformance.
