import sys
from collections import Counter
from pathlib import Path

import streamlit as st

APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = APP_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.components.ui_helpers import (  # noqa: E402
    donut_chart,
    empty_state,
    filetype_badge,
    horizontal_bar_chart,
    inject_global_css,
    metric_card,
    page_header,
    section_label,
)
from app.state import init_session_state  # noqa: E402

inject_global_css()
init_session_state()

page_header(
    eyebrow="MILESTONE 1 \u00b7 STEP 2",
    title="Knowledge Base",
    subtitle=(
        "What is currently indexed in the Chroma vector store: sources, "
        "chunk counts and a look at the underlying chunk content."
    ),
)

store = st.session_state.vector_store
total_chunks = store.count()

if total_chunks == 0:
    empty_state(
        "The knowledge base is empty. Go to <b>Upload &amp; Process</b> to "
        "index some documents first."
    )
    st.stop()

raw = store._collection.get()  # noqa: SLF001 - read-only inspection for this page
metadatas = raw.get("metadatas", [])
documents = raw.get("documents", [])
ids = raw.get("ids", [])

sources = store.list_sources()
per_source_counts = Counter(meta.get("filename", "unknown") for meta in metadatas)
per_type_counts = Counter(meta.get("file_type", "unknown") for meta in metadatas)

col1, col2 = st.columns(2)
with col1:
    metric_card("Documents indexed", str(len(sources)), icon="docs")
with col2:
    metric_card("Total chunks", str(total_chunks), icon="chunks")

chart_col1, chart_col2 = st.columns([3, 2])
with chart_col1:
    section_label("Chunks per source document")
    st.plotly_chart(
        horizontal_bar_chart(labels=list(per_source_counts.keys()), values=list(per_source_counts.values())),
        width="stretch",
        config={"displayModeBar": False},
    )
with chart_col2:
    section_label("File type distribution")
    st.plotly_chart(
        donut_chart(labels=[t.upper() for t in per_type_counts.keys()], values=list(per_type_counts.values())),
        width="stretch",
        config={"displayModeBar": False},
    )

section_label("Indexed sources")

for filename in sources:
    count = per_source_counts[filename]
    ext = Path(filename).suffix.lstrip(".").lower()
    st.html(
        f"""
        <div class="pi-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>{filetype_badge(ext)}&nbsp;&nbsp;<b>{filename}</b></span>
                <span class="pi-source-line">{count} chunk(s)</span>
            </div>
        </div>
        """
    )

section_label("Inspect chunks")

selected_source = st.selectbox("Filter by source document", ["All sources"] + sources)

rows = list(zip(ids, metadatas, documents))
if selected_source != "All sources":
    rows = [row for row in rows if row[1].get("filename") == selected_source]

rows.sort(key=lambda r: (r[1].get("filename", ""), r[1].get("chunk_index", 0)))

for chunk_id, meta, text in rows:
    filename = meta.get("filename", "unknown")
    chunk_index = meta.get("chunk_index", "?")
    with st.expander(f"{filename} \u00b7 chunk {chunk_index} \u00b7 {len(text.split())} words"):
        st.html(f'<div class="pi-chunk-text">{text}</div>')
