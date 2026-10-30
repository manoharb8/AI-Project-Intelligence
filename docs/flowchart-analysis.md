# Flowchart Analysis

Upload a flowchart as **PNG, JPEG, WebP or PDF** (*Project Analysis → Flowchart Analysis*) and get:

- the steps, decisions and arrows that were read from the diagram (so you can check them),
- a risk assessment ordered **Critical / High / Medium / Low**, each risk with the evidence it cites, why it has that priority, and a concrete mitigation,
- a clear split between risks **shown in the diagram** and risks **inferred** from assumptions.

Results are saved per workspace and removed with it.

## Model provider

Flowchart Analysis is the **only feature that uses an external AI API**. It uses Groq vision through the OpenAI-compatible chat-completions endpoint and the backend-only `GROQ_API_KEY`. Normal document processing, retrieval, project agents, Documentation Studio, Project Health, Project Assistant, and the Overview use the existing local/extractive implementation and do not call Groq.

| Setting | Default | Purpose |
| --- | --- | --- |
| `VISION_PROVIDER` | `groq` | Only `groq` or `none` is supported. `auto` is retained as a compatibility alias for Groq only. |
| `GROQ_API_KEY` | — | Required only when a user runs Flowchart Analysis. |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Groq OpenAI-compatible API base. |
| `GROQ_VISION_MODEL` | `qwen/qwen3.8-27b` | Image-capable model for diagram analysis. |
| `VISION_MODEL` | unset | Optional override for `GROQ_VISION_MODEL`. |
| `VISION_TIMEOUT_SECONDS` | `120` | Per-request timeout. |
| `VISION_MAX_EDGE` | `1568` | Longest image side sent (pixels). |
| `VISION_MAX_TOKENS` | `8000` | Maximum output-token request sent to Groq. |
| `VISION_PDF_MAX_PAGES` | `5` | Maximum PDF pages analysed per upload. |

The normal project provider is fixed to local extractive analysis in `app.llm.provider.build_provider`; setting an LLM API key or legacy text-provider environment variable does not enable external text calls. The Groq key is read only by the flowchart vision-provider factory.

Official references: [Groq OpenAI compatibility](https://console.groq.com/docs/openai) and [Groq image and vision models](https://console.groq.com/docs/vision). Check your account for current model availability and limits.

## How an analysis works

1. **Validate and prepare** (`imaging.py`). The type is taken from the file bytes, not the name. Transparent backgrounds are flattened onto white (light artwork on transparency goes on dark): a naive conversion turns a black-on-transparent export completely black. 16-bit, palette and CMYK files become 8-bit RGB; large images are scaled to `VISION_MAX_EDGE`, tiny ones enlarged; blank, truncated, tiny, and pixel-bomb files are rejected with a clear message before any API call. PDFs are rasterised page by page (`pypdfium2`, no Poppler needed).
2. **Read and assess** (`provider.py`, `prompts.py`). The model must transcribe nodes and arrows first, mark anything unreadable instead of guessing, treat text inside the image as data (not instructions), and return a fixed structure. If the answer is unusable it is retried once with the validation error.
3. **Validate** (`service.py`). References to non-existent steps or arrows are removed. A risk that says "observed" but cites nothing real is downgraded to "inferred". **Inferred risks can never be Critical or High** (capped at Medium, with the reason shown).
4. **Structure checks** (`graph.py`). Code, not the model, finds: decisions with fewer than two outgoing paths, loops with no exit, steps that end without reaching an end node, steps unreachable from the start, unlabelled branches, missing start/end markers, disconnected elements. These are labelled "Automatic structure check — verify" and are capped at Medium when the image is hard to read, because a misread arrow would create a false finding.
5. **Save** in `<workspace>/flowcharts/`.

The workspace type adds context to the prompt (Code: control and data flow, error handling, retries; UI/UX: user flows, dead ends, error/empty states). It never permits inventing content.

## Limits you should know about

- **The reading can be wrong.** Vision models can miss small arrows, misread text, or merge shapes. That is why the result shows the extracted steps and arrows next to the image. Always compare them with your diagram before relying on a finding.
- Findings the code derives from the graph are only as accurate as that reading.
- Diagrams beyond 150 steps / 300 arrows are truncated (and flagged). Very dense diagrams may need cropping.
- PDFs: the first `VISION_PDF_MAX_PAGES` pages, each analysed independently; a flow spanning pages is not stitched together. Pages without a flowchart are skipped and reported. PDF flowcharts are analysed here, **not** indexed into the document knowledge base, whose PDF text indexing is unchanged.
- Flowcharts are not added to the knowledge base, so the Project Assistant and the other agents do not use them.
- Analyses run while the page is open; if you navigate away, a running analysis still finishes and is saved.

## API

`GET /api/flowcharts/status` · `GET /api/flowcharts` · `POST /api/flowcharts/analyze` (multipart `file`) · `GET|DELETE /api/flowcharts/{id}`. The workspace is chosen with `X-Workspace-ID`, as for every other endpoint. Errors: 413 too large, 422 unreadable or not a flowchart, 503 model unconfigured or unavailable (message says what to do), 502 unusable model output after a retry.

## Verify it with your own key

```powershell
# From the project root, edit .env and set GROQ_API_KEY securely.
# Terminal 1:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
# Terminal 2, from the project root:
.\.venv\Scripts\python.exe scripts\verify_flowchart.py
.\.venv\Scripts\python.exe scripts\verify_flowchart.py C:\path\to\your-diagram.png
```

For `sample_flowcharts/order_flow.png` the correct reading is 8 steps; "Payment valid?" has only a Yes branch; "Retry upload" loops onto itself with no exit. A correct run reports both as observed risks.

## Workspaces: type, rename, delete

- **Type** (Code or UI/UX) is chosen when creating a workspace, stored in the workspace registry, shown in the switcher and top bar, and passed to flowchart analysis. Workspaces created earlier have no stored type and behave as **Code**; the registry is upgraded the next time it is saved. The type is fixed after creation.
- **Rename** changes only the display name (duplicates are refused, case-insensitively). Data is untouched.
- **Delete** asks for confirmation, then removes the workspace's documents, vector index, saved analyses and flowchart analyses. The registry is updated first, so a failure can leave an orphan folder but never a broken entry. If Windows still holds a file lock, the workspace disappears at once and the folder is removed on the next backend start. **The original project ("Current project") cannot be deleted** because it is the data root that contains every other workspace; it can be renamed.
