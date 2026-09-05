import sys
from pathlib import Path

import streamlit as st

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.components.ui_helpers import (  # noqa: E402
    empty_state,
    horizontal_bar_chart,
    icon_svg,
    inject_global_css,
    metric_card,
    page_header,
    section_label,
    sidebar_brand,
)
from app.state import init_session_state  # noqa: E402


def render_overview() -> None:
    page_header(
        eyebrow="MILESTONE 1 \u00b7 OVERVIEW",
        title="AI-Driven Enterprise Project Intelligence & Risk Management Platform",
        subtitle=(
            "A Retrieval-Augmented Generation platform that turns a project's own "
            "documents into a queryable knowledge base - built to surface risks, "
            "blockers, deliverables and progress without a manual document search."
        ),
    )

    store = st.session_state.vector_store
    total_chunks = store.count()
    sources = store.list_sources()

    col1, col2, col3 = st.columns(3)
    with col1:
        metric_card("Documents indexed", str(len(sources)), icon="docs")
    with col2:
        metric_card("Chunks in knowledge base", str(total_chunks), icon="chunks")
    with col3:
        metric_card("Knowledge base status", "Ready" if total_chunks > 0 else "Empty", icon="status")

    if total_chunks > 0:
        raw = store._collection.get()  # noqa: SLF001 - read-only inspection for a summary chart
        from collections import Counter

        type_counts = Counter(meta.get("file_type", "unknown") for meta in raw.get("metadatas", []))
        section_label("Chunks by file type")
        st.plotly_chart(
            horizontal_bar_chart(
                labels=[t.upper() for t in type_counts.keys()],
                values=list(type_counts.values()),
            ),
            width="stretch",
            config={"displayModeBar": False},
        )

    section_label("How this platform works")
    st.html(
        """
        <div class="pi-card">
            <b>Pipeline stages, in order:</b>
            <div class="pi-source-line" style="margin-top:10px; line-height: 2;">
                1&nbsp;&nbsp;Upload &nbsp;\u2192&nbsp; 2&nbsp;&nbsp;Text extraction &nbsp;\u2192&nbsp;
                3&nbsp;&nbsp;Normalization &nbsp;\u2192&nbsp; 4&nbsp;&nbsp;Chunking &nbsp;\u2192&nbsp;
                5&nbsp;&nbsp;Embedding generation &nbsp;\u2192&nbsp; 6&nbsp;&nbsp;Chroma vector indexing
                &nbsp;\u2192&nbsp; 7&nbsp;&nbsp;Query &amp; retrieval
            </div>
        </div>
        """
    )

    left, right = st.columns(2)
    with left:
        section_label("Milestone 1 scope")
        st.html(
            """
            <div class="pi-card pi-card-accent">
                Document ingestion for PDF, DOCX, CSV and TXT files, a working RAG
                pipeline (extraction through retrieval), and a query interface
                that shows retrieved chunks with source and relevance
                information - including an explicit signal when the uploaded
                documents do not contain enough information to answer a query.
            </div>
            """
        )
    with right:
        section_label("Deferred to later milestones")
        st.html(
            """
            <div class="pi-card">
                Automated risk scoring, delivery forecasting, a project health
                dashboard and a conversational assistant are intentionally out
                of scope for Milestone 1 and are not implemented in this build.
            </div>
            """
        )

    section_label("Get started")
    if total_chunks == 0:
        empty_state(
            "The knowledge base is empty. Go to <b>Upload &amp; Process</b> in the "
            "sidebar to upload project documents (or use the bundled sample "
            "documents) and build the knowledge base."
        )
    else:
        st.html(
            f"""
            <div class="pi-card">
                <b>{len(sources)}</b> document(s) are indexed as <b>{total_chunks}</b> chunk(s).
                Go to <b>Query &amp; Retrieve</b> in the sidebar to ask a question,
                or <b>Knowledge Base</b> to inspect what has been indexed.
            </div>
            """
        )


st.set_page_config(
    page_title="Project Intelligence Platform",
    page_icon="\U0001F9ED",
    layout="wide",
    initial_sidebar_state="expanded",
)

inject_global_css()
init_session_state()
sidebar_brand()

pages = [
    st.Page(render_overview, title="Overview", icon="\U0001F9ED", default=True),
    st.Page("pages/1_Upload_and_Process.py", title="Upload & Process", icon="\U0001F4E4"),
    st.Page("pages/2_Knowledge_Base.py", title="Knowledge Base", icon="\U0001F5C2\uFE0F"),
    st.Page("pages/3_Query_and_Retrieve.py", title="Query & Retrieve", icon="\U0001F50E"),
]

navigation = st.navigation(pages)
navigation.run()
