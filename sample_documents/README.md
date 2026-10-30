# AI Project Intelligence & Risk Advisor — organized sample documents

Use the three folders below to test the existing application's upload, analysis, matrix, and flowchart routes. Samples are not seeded automatically. Create a new workspace first and upload only the files relevant to that test.

## Folders

- `01_Sample_Documents/`: six internally consistent document formats for the fictional Atlas Citizen Services Portal (`ATL-26`), plus a genuine PSD composite sample. Signals include a pending staging credential approval, coverage below the release gate, pending accessibility sign-off, a rollback rehearsal without evidence, and missing load-test ownership/target.
- `02_Meeting_Notes/`: exactly three chronological DOCX records: initial review, progress/blockers, and readiness review. Risks carry forward explicitly; the latest note does not claim they were resolved.
- `03_Flowcharts/`: a normal flowchart, a diagram with intentional logical issues, a WebP example, and a two-page PDF for page-by-page testing.

## Expected validation behavior

1. Upload individual files or a mixed batch. A corrupt/unsupported file should report its own error without preventing valid siblings from indexing.
2. Run Risk & Delivery and Blockers & Actions with a single document. Results must cite the source file and extracted page/row/paragraph, and missing values must stay unknown.
3. Open Flowchart Analysis and submit each image/PDF. The vision provider must be configured with a valid `GROQ_API_KEY`; the `qwen/qwen3.8-27b` model is the documented Groq vision default. PDF analysis may return two page analyses.
4. `Architecture_Flow.psd` is a genuine PSD v1 composite and needs the Tesseract command-line executable available on `PATH` for OCR text indexing. It is not a flowchart-upload format; export it to PNG to use the flowchart page.

All people, dates, budget amounts and project records in this folder are fictional test fixtures. Existing flat files at this folder's root are retained for compatibility with the project's earlier tests and guides. Runtime workspace data lives under `backend/data/` by default and must not be replaced with sample data.
