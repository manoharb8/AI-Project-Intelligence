# Milestone 4 verification

Executed on 2 October 2026 against the final-release source. These results describe checks actually run; they do not claim mentor approval, native Windows execution or browser visual acceptance.

## Executed checks

| Check | Result |
| --- | --- |
| Full Python suite: `python -m pytest -q` | **230 passed**, 2 dependency deprecation warnings, 13.61 s |
| Existing M1/M2/M3 regression tests | Retained and passing as part of the 230-test run |
| Existing real FastAPI/Vite live-server tests | **2 passed**, included in the 230 total; actual loopback HTTP/proxy/startup exercised |
| New real incremental API tests | **2 passed**, included in the 230 total; actual PDF/DOCX/CSV/TXT parsers, WordLlama and Chroma |
| Frontend: `npm test --prefix frontend` | **76 passed**, 6 test files; final run 13.67 s |
| Production build: `npm run build --prefix frontend` | TypeScript and Vite passed |
| Backend implementation preservation | Every baseline `backend/app/` file byte-identical |
| Historical documentation preservation | Every pre-existing `docs/` file byte-identical; new M4 documents are additive |
| API contracts, health formula, retrieval settings, dependencies, samples | Preserved from baseline |

Python runtime: 3.12.14 on Linux. Node.js: 24.19.0. Vite: 6.4.3. Vitest: 3.2.7. Validation used the existing installed dependencies and local extractive provider. No live external LLM/API key was used.

The dependency environment initially could not resolve the packaged WordLlama tokenizer and attempted to create a cache under a read-only home directory. The test environment was repaired to expose the package's already-bundled tokenizer at its expected local lookup path. No tokenizer/embedding algorithm, application adapter, project dependency or backend source was changed, and no fake embeddings were substituted. Tests needed the approved local process permissions for the real Chroma/live-server checks. The two remaining Python warnings concern Starlette/httpx and AnyIO deprecated interfaces, not failed assertions.

## What the new checks establish

### Dashboard and interaction coverage

- Overview automatically activates the existing broad briefing resources; cached Studio/Health/Assistant results remain reusable.
- M2 analysis and Evidence Search remain manual.
- Dashboard fields come directly from typed responses. Health direction, unknown scores, exact source statuses and owner/date gaps are preserved.
- Action filters retain exact source labels and can return to all entries.
- Empty sources do not launch intelligence requests.
- A failed health request retains documentation panels; Retry health does not regenerate unrelated resources.
- Status popover expanded state, Escape dismissal and trigger focus restoration work in DOM tests.
- Existing tests still cover mobile focus trapping/backdrop/Escape, queue rules, navigation state, Strict Mode duplicate prevention, source-change refresh, late-response rejection and insufficient evidence.

### Incremental upload coverage

- Real SHA-256 tests distinguish changed bytes from renamed identical files and respect source formats.
- Exact duplicates indexed in the current session are skipped without changing the source count/revision.
- Changed content with the same filename and size is accepted.
- Exact duplicates within a batch upload once.
- Rejected uploads remain retryable; unavailable hashing does not falsely reject files.
- Real initial four-format ingestion remains searchable after a new TXT upload.
- Original document IDs and original retrieved passage text remain present.
- The new source is included in documentation, health and assistant evidence, with exact quotations validated.
- Health methodology/version/weights remain unchanged after the additional evidence.
- Unsupported delivery-probability questions remain insufficient-information responses.
- Reopening the same persistent store retains all five indexed sources.
- A malformed additional PDF is reported as a failed document without damaging the original index.

## Unverified checks and limits

| Check | Current limitation |
| --- | --- |
| Actual browser screenshots/rendering at 360, 768, 1024 and 1440 px | Cloud Browser refused localhost with `ERR_BLOCKED_BY_CLIENT`; the official Chromium test-browser download returned invalid/truncated archives |
| Visual empty/loading/error/populated layout acceptance | DOM state tests pass, but rendered browser acceptance remains unverified |
| Reduced-motion rendering | CSS includes explicit reduced-motion overrides; actual browser motion inspection remains unverified |
| Native Windows/Python 3.11 runtime | Existing Windows requirements preserved; this release ran on Linux/Python 3.12 |
| Optional external provider | Existing mocked-adapter regression coverage passes; no live external service verified |
| Global duplicate detection across sessions/direct API uploads | Not implemented; unchanged APIs expose no stored content hashes. M4 deduplication is session/batch scoped |

The final demo guide includes a concise manual browser acceptance checklist. Test counts are not a substitute for these outstanding checks.

## Preservation and delivery notes

The prior supplied automatic-intelligence ZIP was compared with the current GitHub `main` checkout and all 153 source files matched. The repository baseline was `0876aac01d54e1dd63acbd1fc450b7293eac4342`.

The legacy M2 live test rewrites `docs/milestone2-live-verification.json` as a side effect. After running it, that report was restored byte-for-byte from the baseline. No old test was removed. Two old timing assertions were adjusted for the new asynchronous hash preflight, and the old Overview-manual expectation was updated for the explicitly required M4 dashboard automation. Other regression expectations were retained.

README receives only a final-release entry point above its retained earlier text. The original file manifest remains historical; `milestone4-files.md` lists the current release additions and changes. No source generator, local database, secret, node_modules, virtual environment or build cache belongs in the ZIP.

Git publication is independently verified at delivery; the test results above do not imply a successful push. The intended release commit message is `Complete Milestone 4 insights dashboard and final product polish`.

### GitHub publication outcome

The existing repository was cloned and its baseline verified. The prepared release was committed locally with the message above. `git push origin main` was attempted and failed with `could not read Username for 'https://github.com': No such device or address`. No GitHub sign-in credentials were available in this environment, so **the release was not pushed**. A Git-format patch is included alongside the complete project folder in the ZIP for publication from a signed-in local clone. The package contains complete runnable source regardless of whether the patch is used.
