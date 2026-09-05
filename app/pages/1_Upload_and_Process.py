import sys
from pathlib import Path

import streamlit as st

APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = APP_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.components.ui_helpers import (  # noqa: E402
    empty_state,
    filetype_badge,
    inject_global_css,
    page_header,
    status_badge,
)
from app.state import CHUNK_OVERLAP, CHUNK_SIZE, init_session_state  # noqa: E402
from rag_pipeline.embeddings import EmbeddingGenerator  # noqa: E402
from rag_pipeline.pipeline import process_documents  # noqa: E402

inject_global_css()
init_session_state()

page_header(
    eyebrow="MILESTONE 1 \u00b7 STEP 1",
    title="Upload & Process Documents",
    subtitle=(
        "Upload project artifacts (PDF, DOCX, CSV, TXT), then run them through "
        "extraction, normalization, chunking, embedding generation and Chroma "
        "vector indexing in one step."
    ),
)

SAMPLE_DOCS_DIR = PROJECT_ROOT / "data" / "sample_documents"

# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
st.markdown("#### 1. Choose documents")

upload_col, sample_col = st.columns([2, 1])

with upload_col:
    uploaded_files = st.file_uploader(
        "Upload PDF, DOCX, CSV or TXT files",
        type=["pdf", "docx", "csv", "txt"],
        accept_multiple_files=True,
    )

with sample_col:
    st.html(
        '<div class="pi-card">Don\'t have documents handy? Use the bundled '
        "sample project documents (proposal, requirements, sprint update, "
        "task list, risk report, meeting notes) to try the pipeline.</div>"
    )
    use_sample_docs = st.checkbox("Use bundled sample documents instead")

files_to_process = []
if use_sample_docs and SAMPLE_DOCS_DIR.exists():
    for path in sorted(SAMPLE_DOCS_DIR.iterdir()):
        if path.suffix.lower() in {".pdf", ".docx", ".csv", ".txt"}:
            files_to_process.append((str(path), path.name))
elif uploaded_files:
    for uploaded in uploaded_files:
        files_to_process.append((uploaded, uploaded.name))

if files_to_process:
    st.markdown("#### 2. Files ready to process")
    for file_input, filename in files_to_process:
        if hasattr(file_input, "size"):
            size_kb = file_input.size / 1024
            size_label = f"{size_kb:.1f} KB"
        else:
            size_label = f"{Path(file_input).stat().st_size / 1024:.1f} KB"
        ext = Path(filename).suffix.lstrip(".").lower()
        st.html(
            f'<div class="pi-source-line">{filetype_badge(ext)}&nbsp;&nbsp;{filename} '
            f"&nbsp;&middot;&nbsp; {size_label}</div>"
        )
else:
    empty_state("No files selected yet. Upload files above or use the bundled sample documents.")

# ---------------------------------------------------------------------------
# Process
# ---------------------------------------------------------------------------
st.markdown("#### 3. Process")

process_clicked = st.button(
    "Process documents", disabled=not files_to_process, type="primary"
)

if process_clicked:
    with st.spinner("Extracting, normalizing, chunking, embedding and indexing..."):
        fresh_generator = EmbeddingGenerator()
        results = process_documents(
            files=files_to_process,
            embedding_generator=fresh_generator,
            vector_store=st.session_state.vector_store,
            chunk_size=CHUNK_SIZE,
            overlap=CHUNK_OVERLAP,
            clear_existing=True,
        )
        st.session_state.embedding_generator = fresh_generator
        st.session_state.processing_results = results

if st.session_state.processing_results:
    st.markdown("#### Processing status")
    succeeded = 0
    failed = 0
    for result in st.session_state.processing_results:
        status = "success" if result.status == "success" else "error"
        succeeded += status == "success"
        failed += status == "error"
        detail = result.message
        with st.container():
            st.html(
                f"""
                <div class="pi-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>{filetype_badge(result.document.file_type)}&nbsp;&nbsp;<b>{result.filename}</b></span>
                        {status_badge(status)}
                    </div>
                    <div class="pi-source-line" style="margin-top:8px;">{detail}</div>
                </div>
                """
            )

    if failed == 0:
        st.success(
            f"Processed {succeeded} document(s) successfully. "
            "Go to Query & Retrieve to ask a question, or Knowledge Base to "
            "inspect the indexed chunks."
        )
    else:
        st.warning(
            f"Processed {succeeded} document(s) successfully, {failed} failed. "
            "See the status above for details on what went wrong."
        )
