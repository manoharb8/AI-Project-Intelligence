# Reference-inspired dashboard refinement

## Implemented changes
- Existing dashboard refined against the supplied image as inspiration, retaining the application's own data and branding.
- Compact desktop heading/metric composition, contained chart-and-record panels, restrained surface depth, aligned severity filters and consistent workflow/export styling.
- Positioned records display documented owner and due date; unavailable values remain Not stated.
- Additional observations use an accessible, count-labeled evidence disclosure. The nine source-identified risks remain in the main matrix, with canonical grouping and every supporting reference preserved. Unpositioned identified risks remain visible in their evidence area.
- Existing geometric core logo is retained and its alignment/depth refined consistently through shared styling.
- Original Overview order retained: project header, risk matrix, workflow/export, health, risks, actions, scope.
- No changes to automatic execution, API contracts, backend, risk extraction, scoring, exports, notification timing, workspace storage, or source documents.

## Executed verification
- Production build: TypeScript + Vite passed (3.42 seconds).
- Backend: 317 passed, one dependency deprecation warning (32.75 seconds). Export regression tests downloaded PDF and DOCX through the API and parsed their text to verify scores, missing-information labels and evidence. Browser download clicks remain unverified.
- Frontend: 170/170 cases reported passed in 16 modules, no failed cases. Existing coverage includes automatic analysis, duplicate prevention, source changes, workspace isolation, themes, navigation, export interactions and toast expiry. Sample risk tests cover nine canonical risks, ten observations, all severity filters and bounds/overlap geometry down to a 180px plot. The observation test now opens the evidence disclosure before checking all ten records.
- Runner limitation: Vitest did not exit after reporting module results; the harness terminated each completed worker. This is not a clean full-suite process exit.
- Fresh six-document sample ingestion and API analysis: six indexed documents, 126 passages, 19 returned observations/risks, nine named risks, health score 40. Samples are unchanged. No sample values were added to application runtime code.
- Byte comparison: all pre-existing non-frontend source files and historical documents match the previous delivery. One historical JSON rewritten by a test was restored from the original archive.

## Browser / visual QA limitation
The preview daemon was unavailable. Standard Vite preview startup also encountered a network-interface environment error. A direct development-server attempt could not be reached from the cloud browser (`ERR_CONNECTION_REFUSED`). There is no new rendered screenshot. Desktop/mobile visual layout, actual font rendering, both theme appearances, motion and browser keyboard behavior are therefore unverified. See design-qa.md. Do not treat test/build success as visual approval.

## Files modified
- frontend/src/dashboard/RiskPriorityMatrix.tsx
- frontend/src/presentation/IntelligenceMark.tsx
- frontend/src/dashboard/canonicalRisks.test.tsx

## Files added
- frontend/src/presentation/referenceFinish.css
- docs/REFERENCE_DASHBOARD_REFINEMENT.md
- design-qa.md

The ZIP excludes dependencies, build output, temporary runtime databases and test harness files.
