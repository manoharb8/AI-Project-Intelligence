# Final UI refinement: automatic analysis and report downloads

This update continues the workspace-enabled M1–M4 application. Earlier milestone files remain historical records. It changes navigation and orchestration, not the evidence pipeline or health methodology.

## User flow

1. Select the correct project in the top workspace switcher, or create a new empty workspace.
2. Open **Documents**, select PDF, DOCX, CSV or TXT sources, then **Upload & index**.
3. Wait for **Reading documents → Analyzing project → Preparing insights → Ready**. These states describe actual requests; no progress percentage is simulated.
4. Review **Scope & Deliverables**, **Risk & Delivery**, **Blockers & Actions**, or **Overview**. All three analysis requests start automatically when indexing and the provider are ready. Missing evidence remains unknown.
5. Documentation, health and the Project Assistant briefing prepare after the three analysis requests complete. Conversational follow-ups remain optional.
6. Use **Export / Download** in the workflow bar to choose **PDF report** or **Microsoft Word (.docx)**. Downloads contain saved evidence-grounded results for the selected workspace.

**Knowledge Base** and **Evidence Search** are no longer frontend destinations. Old URLs fall back to Overview through the existing catch-all route. Their backend APIs, document storage, retrieval logic and existing extraction behavior remain intact. Evidence can still be expanded beside findings and insights. The retired screen components remain only for isolated regression tests and are not imported by the running application.

## Automatic execution

The frontend reuses `AutomaticResource` and `useAutomaticWork` for M2, with one cache per workspace, analysis kind and applied review focus. Readiness must be stable for 350 ms. Successful cached results hydrate from the existing workspace state on reload and are reused on navigation.

Source versions track indexed document IDs and passage counts, matching the existing source-version convention. Upload/indexing start invalidates in-flight request tokens; changed source versions invalidate cached attempts. Late results from an older source version are discarded. Useful completed results remain visible with an out-of-date label during a source refresh. Inactive workspaces do not start new automatic requests; their existing in-flight operations stay associated with their original workspace.

The three M2 agents execute once per ready source version/applied focus. A failed request is not retried automatically or merely because the user revisits a route. **Refresh**, **Retry analysis**, and the workflow's **Retry failed requests** are explicit recovery controls. Review focus editing remains optional and is applied when refreshed, not on each keystroke.

M3 continues to use the approved documentation, health and assistant services. Those services compose the existing M2 agents internally; this frontend change does **not** claim to pass completed frontend M2 objects into M3. Default documentation and health results share their existing query cache with the briefing. A manual M2 refresh that returns a changed generation timestamp refreshes the dependent default intelligence results. There is no new retrieval system, background provider polling, or automatic conversation message pretending to be user input. The pre-existing bounded upload-status timer runs only while an upload request is in flight.

## Notifications and presentation

Toasts reflect completed upload responses, actual analysis requests, intelligence completion/failure and completed download preparation. Partial/insufficient results are identified as such. Related analysis notices replace earlier notices from the same operation group. Success/information notices dismiss after eight seconds, pause on hover/focus, and can be dismissed. Warnings/errors stay until dismissed or superseded. Notifications are workspace-local, use a polite live region, and are not saved to browser storage.

The existing navy, blue, white and amber identity and session theme preference remain. The added workflow, download popover, skeletons and toast surfaces use existing semantic theme tokens. Motion is short and finite, respects reduced motion, and never represents fabricated progress. Existing findings, quotes, unknown fields, timestamps, category navigation and health visualizations retain their data and meanings.

## Export contract

Additive endpoint:

`GET /api/workspaces/{workspace_id}/export?format=pdf|docx`

Send `X-Workspace-ID` matching the path, as for other workspace requests. Existing endpoints and response contracts are unchanged.

- Reads a snapshot of saved results; does not run retrieval, invoke an LLM, recalculate health or modify project state.
- Chooses the latest current-source result per M2 kind. Documentation and health prefer an available current broad default focus, otherwise the most recent available focus. The actual focus and generation timestamp are printed.
- Falls back to saved older results when necessary, clearly labeled **OUT OF DATE**. Missing sections state **Insufficient evidence / Not generated**. Null owners, dates and unsupported fields print **Not stated**; missing health never becomes zero.
- Includes scope-based project summary, scope/deliverables, risks/outlook, blockers/actions, structured stories/register/action lists, existing health calculations/directions, default project briefing, exact supporting quotes and source appendix.
- Includes the automatic briefing's two existing default answers. Optional follow-up conversations are not silently included in a shareable report.
- Finding counts describe returned findings, not independently verified unique incidents. Source quotations are not rewritten.
- Response uses `Content-Disposition: attachment`, the format MIME type, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` and the selected workspace ID.
- Invalid format: 422. Unknown workspace: 404. Conflicting header, still-processing sources or absent saved M2 analysis: 409. Server failures retain the existing error handler.
- UI waits for current requests to settle before enabling download. Partial reports are allowed when a request fails, with unavailable/older sections labeled. Users can retry failed requests first to obtain a current complete report.
- PDF uses bundled licensed DejaVu fonts; it needs no online font service. For source characters that the bundled fonts cannot represent, export returns an explicit 422 directing the user to Word instead of silently dropping text. Word preserves Unicode text, subject to fonts installed on the reader's computer.

## Upgrade on Windows without losing data

Use the same project folder and retain the existing `DATA_DIR`, including its documents manifest, Chroma files, workspace registry and workspace result files. Stop both servers, back up that data directory, then apply this source update to the existing code. Do not replace it with an empty runtime data folder. This source distribution contains no runtime databases, virtual environment, node_modules or secrets.

Refresh dependencies from the project root (the existing `.venv` can be reused):

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-windows-py311.txt
cd frontend
npm ci --include=dev
```

Terminal 1, from the project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Terminal 2, from the project root:

```powershell
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173`. No external API key is required in the existing local extractive mode. For a genuinely new installation, follow the existing Python 3.11 / Node setup instructions in README first.

## Scope and limits

Existing ingestion, chunking (180 words / 30 overlap), WordLlama l2_supercat 256-dimensional embeddings, ChromaDB, provider abstraction, M1/M2/M3 evidence validation and health calculations are unchanged. Workspace partitioning and its existing single-process/single-user limitations remain. This update does not add authentication, delete documents, migrate databases or push to GitHub.

Automatic coordination runs while the app is open. Separate browser tabs can issue independent analysis requests; there is no cross-tab provider lock or background server job scheduler. Existing source fingerprints detect changes to indexed IDs/counts, not unsupported manual edits to a database file. Downloaded reports are snapshots, not live documents. Native Windows execution, a paid/live external LLM and a complete manual screen-reader audit were not available for this verification; see the verification report.
