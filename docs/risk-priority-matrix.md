# Risk Priority Matrix — scoped dashboard update

## Location and use

Open **Overview → Project Insights & Risk Summary**. The matrix appears after the existing scope/health overview and before the existing risk/action panels. It uses the current workspace's existing briefing documentation result, including its risk register and source evidence. It does not initiate requests or require regeneration to inspect a result already loaded.

The summary shows returned risk-entry count, the count explicitly labelled Critical or High, the number positioned on the selected axes, and the count with missing/unknown severity. These are counts of returned register entries, not verified unique incidents or a complete inventory of all project risks. Severity filters affect the graph and record list; summary counts continue to describe the full returned register.

Hover or focus a point to inspect its source values. Click a point or a risk record to open the existing record's complete title, description, categories, severity, likelihood, impact, source status, documented mitigation and source references. Supporting quotations use the existing SourceQuotes component. Missing values use the existing Not stated convention.

## Honest positioning rules

- Probability is the existing `likelihood` field; impact is the existing `impact` field. Severity comes only from `severity`. No text classifier, risk formula, likelihood estimate or health-to-risk conversion is added.
- Exact, case-insensitive Low / Moderate / High probability levels and Low / Moderate / High / Critical impact levels can be positioned on ordered category axes. Whitespace and case are normalized for matching only; displayed source values are unchanged. Category positions are not numeric risk scores.
- Explicit percentages from 0% through 100% can be displayed on percentage axes. Both zero and 100 are retained. When sources mix percentages and categorical levels, the relevant scale selector appears. The default pair of axes accommodates the largest number of directly comparable entries; ties retain category-first order. Switching axes never converts a level into a percentage.
- Missing values, prose descriptions, bare numbers without an established scale, fractions and unsupported rating words remain **Unpositioned**. Their original values and evidence remain accessible in the adjacent record list. Severity does not supply a missing coordinate. Descriptive impact is not silently assigned a severity level.
- The four severity legend levels are Critical, High, Moderate and Low. Other source wording stays unchanged and neutral under Other / Not stated. For example, Medium is not silently renamed Moderate.
- At identical coordinates, a count marker opens a selector for the individual source records. It indicates coincident entries, not an inferred cluster. Coordinates are never jittered to imply differing values. Closely spaced points remain accessible individually through the record list.
- Upper-right shading indicates the direction of increasing stated probability and impact. It does not define severity thresholds, calculate a priority rank or represent a historical trend.

The previously verified four-document sample's saved risk register contains eight entries with no stated likelihood, impact or severity. Its honest display is eight unpositioned entries and no invented plotted points. Add actual source-backed ratings to project documents if those facts become available, then use the existing update workflow. Do not invent ratings merely to populate the graph.

## States and accessibility

Unavailable results show dashes instead of fabricated zero counts. Empty results explicitly state that an empty returned register does not prove absence of risks. Retained stale results and failed refreshes are labelled. Existing automatic generation, workspace isolation, retries and provider behaviour are unchanged.

Points and filters are native keyboard-operable buttons. Tooltips respond to focus as well as hover and can be dismissed with Escape. The native modal has a labelled heading, a visible close button, keyboard focus containment, Escape handling and focus restoration to its opener. Evidence expands using existing accessible details/summary controls. Severity text accompanies colour; missing entries are never hidden from the record list.

Light/dark presentation uses existing theme variables. Brief entrance and hover transitions are finite, with no looping effects or simulated progress. Reduced-motion preferences disable the matrix's movement and transitions. The desktop graph and record list sit side by side; mobile places the record list underneath with intentional internal scrolling.

## Files changed

Modified:
- `frontend/src/dashboard/ProjectInsights.tsx` — imports and renders the new matrix using existing result/state props.

Added:
- `frontend/src/dashboard/RiskPriorityMatrix.tsx`
- `frontend/src/dashboard/RiskDetailsDialog.tsx`
- `frontend/src/dashboard/riskMatrixModel.ts`
- `frontend/src/dashboard/riskMatrix.css`
- `frontend/src/dashboard/RiskPriorityMatrix.test.tsx`
- `docs/risk-priority-matrix.md`

Every other existing project file is byte-identical to the prior delivered source ZIP, including backend code, APIs, schemas, agents, retrieval, health scoring, dependency manifests, original tests, sample documents and historical milestone records. No dependencies, routes, browser persistence or backend endpoints were added. Existing PDF/Word export behaviour is unchanged.

## Verification performed for this patch

- Full frontend suite: **133 tests passed in 12 test files**, including all 121 existing tests unchanged and 12 focused matrix tests.
- Production build: **passed**, TypeScript and Vite.
- Browser checks: **25 assertions passed**, with no browser runtime errors. Checked the real saved eight-entry sample result, isolated coordinate fixtures, filters, exact-coordinate overlap selection, tooltips, modal evidence expansion, keyboard focus/return, mobile detail review and reduced motion.
- Responsive checks: 360px, 768px, 1024px and 1440px in both light and dark themes, with no horizontal page overflow. Matrix screenshots were reviewed on mobile and desktop.
- Accessibility scans: four axe WCAG 2 A/AA and WCAG 2.1 AA scans of the matrix at 360px/1440px in both themes; **zero reported violations**. This is not a claim of full accessibility certification or a substitute for screen-reader testing.
- No added API/provider requests were observed while displaying, filtering or inspecting the matrix and switching themes. Saved results were reused.
- Preservation: compared every original ZIP file byte-for-byte; the dashboard integration file is the only modified existing file.

Browser checks replayed previously saved API results and used clearly separated, temporary synthetic coordinate fixtures to exercise populated positions. Those fixtures are not included in application runtime data or the source ZIP. A live backend was not started for this patch: the current verification environment lacks its installed dependencies. Backend tests, native Windows execution, external providers and a full manual screen-reader pass were not rerun. The prior verification report remains historical; its backend counts are not claimed as a new run here.

## Updating an existing installation

Keep your existing project data directory, workspace registry/state, configuration and Python environment. This patch changes frontend presentation only. Apply the six new files and the single modified file above, or use the complete source ZIP while retaining your existing runtime data/configuration. No database reset, new Python package, frontend package change or API key is needed. Run the existing frontend commands (`npm run dev`, or `npm run build` for the production build) from `frontend/`.
