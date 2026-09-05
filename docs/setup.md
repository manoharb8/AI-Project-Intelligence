# Setup Guide

## Prerequisites

- Python 3.10+ (developed and tested on Python 3.12)
- pip
- No external services, API keys, or GPU required for Milestone 1.

## 1. Get the code into VS Code

Extract the project ZIP and open the resulting `AI-Project-Intelligence/`
folder in VS Code (`File > Open Folder...`).

## 2. Create and activate a virtual environment

macOS / Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

Windows (PowerShell):

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

VS Code should detect the new `venv` and offer to select it as the
workspace Python interpreter - accept that prompt (or select it manually
via `Ctrl+Shift+P` / `Cmd+Shift+P` -> "Python: Select Interpreter").

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 4. (Optional) Environment configuration

Milestone 1 does not require any environment variables to run. If you
want a `.env` file for local overrides anyway (e.g. for a future
milestone), copy the template:

```bash
cp .env.example .env
```

## 5. Run the test suite

```bash
pytest
```

You should see all tests pass, covering ingestion (PDF/DOCX/CSV/TXT),
normalization, chunking, embeddings, Chroma indexing, and retrieval
(including multi-document retrieval, source metadata, and the
insufficient-information case) against the bundled sample project
documents.

## 6. Run the application

```bash
streamlit run app/main.py
```

This opens the app in your browser (typically `http://localhost:8501`).
Use the sidebar to navigate:

1. **Upload & Process** - upload your own PDF/DOCX/CSV/TXT files, or
   check "Use bundled sample documents" to try the pipeline immediately
   without preparing your own files. Click **Process documents**.
2. **Knowledge Base** - see what got indexed: sources, chunk counts, and
   the actual chunk text.
3. **Query & Retrieve** - ask a question (or click one of the example
   queries) and see the retrieved chunks with source, chunk position and
   relevance score.

## 7. Regenerating the sample documents (optional)

The sample documents in `data/sample_documents/` were generated once by
`scripts/generate_sample_data.py` and are already included in this
project - you do not need to run this again. If you want to regenerate
or modify them:

```bash
python scripts/generate_sample_data.py
```

This requires `fpdf2`, which is already in `requirements.txt`.

## Troubleshooting

- **"No module named 'rag_pipeline'"** when running `pytest` or the app
  directly: make sure you're running commands from the project root
  (the folder containing `requirements.txt`), not from inside `app/` or
  `tests/`.
- **Query page says the embedding model "has not been fit yet"**: this
  happens after restarting the Streamlit app - the knowledge base on
  disk is still there, but the in-memory TF-IDF model needs to be
  re-fit for this session. Go to Upload & Process and click
  **Process documents** again (checking "Use bundled sample documents"
  if you don't have the original files handy).
