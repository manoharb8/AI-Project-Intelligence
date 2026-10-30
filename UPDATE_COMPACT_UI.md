# Compact UI and report update

This ZIP contains the complete source project, including the updated PDF/Word exports.

## UI changes
- Scope, Risk and Blockers: three findings per category initially; remaining entries expand. Long quotations have Read full text / Show less. Owners, dates, status and sources remain available under View details & source.
- Project Assistant: shorter briefing previews, expandable supporting findings, concise risk descriptions, optional action table and missing-information details. Chat initially shows up to three answer bullets with remaining text expandable.
- Smaller briefing header, tighter spacing and consistent disclosure controls. Light/dark themes and reduced-motion rules retained.
- No backend analysis, scores, workspace data or API contracts changed for this UI update. Complete original text remains available.

## Included export update
Navy/teal/gold PDF and editable Word reports, actual-data Risk Priority Matrix, canonical Risk IDs, readable tables and evidence appendix. See docs/export-report-refinement.md for details.

## Files changed for the compact UI
frontend/src/components/ExpandableText.tsx
frontend/src/components/ExpandableText.test.tsx
frontend/src/pages/AgentAnalysis.tsx
frontend/src/pages/Assistant.tsx
frontend/src/intelligence/ProjectBriefing.tsx
frontend/src/presentation/compact.css
frontend/src/main.tsx
frontend/src/Agents.test.tsx (opens the new details disclosure before inspecting source)

## Verification
Backend: 332 passed, 2 live tests deselected. Frontend: 190 test cases passed across 19 files after fixing and rerunning affected tests; the runner processes required termination after reporting all results. TypeScript/Vite production build succeeded. Browser launch failed in this environment, so desktop/mobile visual appearance remains unverified in a live browser. Existing export verification and rendered sample PDF/Word are included.

## Install without losing your current project data
Back up your current project. Extract this ZIP into a separate folder. To update the existing installation, copy frontend/src and backend/app/exports from this release into the matching folders of your existing project. Keep your current runtime data, workspace storage, .env and .venv. Do not replace or delete them. Restart the backend and frontend using your existing commands.

For a fresh installation, follow README.md. This source ZIP intentionally contains no installed node_modules, .venv, credentials or runtime databases; previous project data stays in your existing installation.
