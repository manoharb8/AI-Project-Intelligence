import sys
from pathlib import Path

import streamlit as st

APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = APP_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.components.ui_helpers import (  # noqa: E402
    empty_state,
    filetype_badge,
    horizontal_bar_chart,
    inject_global_css,
    page_header,
    section_label,
)
from app.state import init_session_state  # noqa: E402
from rag_pipeline.retrieval import (  # noqa: E402
    DEFAULT_DISTANCE_THRESHOLD,
    has_sufficient_information,
    retrieve,
)

inject_global_css()
init_session_state()

page_header(
    eyebrow="MILESTONE 1 \u00b7 STEP 3",
    title="Query & Retrieve",
    subtitle=(
        "Ask a question about the indexed project documents. Retrieval "
        "searches the Chroma vector store and returns the most relevant "
        "chunks, with source, chunk position and a relevance score."
    ),
)

store = st.session_state.vector_store
total_chunks = store.count()

if total_chunks == 0:
    empty_state(
        "The knowledge base is empty. Go to <b>Upload &amp; Process</b> to "
        "index some documents before querying."
    )
    st.stop()

example_queries = [
    "What are the current project risks?",
    "What are the major project blockers?",
    "Which tasks are incomplete?",
    "Which deliverables are due in Milestone 1?",
]

st.markdown("#### Ask a question")
query = st.text_input("Query", placeholder="e.g. What are the current project risks?")

example_cols = st.columns(len(example_queries))
for col, example in zip(example_cols, example_queries):
    with col:
        if st.button(example, width="stretch"):
            query = example
            st.session_state["_last_query"] = example

with st.expander("Advanced retrieval settings"):
    top_k = st.slider("Top-K chunks to retrieve", min_value=1, max_value=10, value=5)
    distance_threshold = st.slider(
        "Relevance distance threshold (lower = stricter)",
        min_value=0.0, max_value=1.0, value=DEFAULT_DISTANCE_THRESHOLD, step=0.01,
    )

run_query = st.button("Search knowledge base", type="primary", disabled=not query)

if run_query and query:
    generator = st.session_state.embedding_generator
    results = retrieve(
        query=query,
        embedding_generator=generator,
        vector_store=store,
        top_k=top_k,
        distance_threshold=distance_threshold,
    )

    st.markdown("#### Results")

    if not has_sufficient_information(results):
        st.warning(
            "The uploaded documents do not contain enough information to "
            "confidently answer this query. Showing the closest chunks "
            "found, for transparency - but none meet the relevance "
            "threshold, so no answer is being asserted."
        )

    if results:
        section_label("Match strength by result")
        chart_labels = [f"#{i} \u00b7 {r.filename}" for i, r in enumerate(results, start=1)]
        chart_values = [round(max(0.0, (1 - r.distance)) * 100, 1) for r in results]
        st.plotly_chart(
            horizontal_bar_chart(labels=chart_labels, values=chart_values, value_suffix="%"),
            width="stretch",
            config={"displayModeBar": False},
        )

    for rank, result in enumerate(results, start=1):
        relevance_pct = max(0.0, (1 - result.distance)) * 100
        relevant_note = "relevant" if result.is_relevant else "below relevance threshold"
        st.html(
            f"""
            <div class="pi-card {'pi-card-accent' if result.is_relevant else ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="pi-source-line">
                        #{rank}&nbsp;&nbsp;{filetype_badge(result.file_type)}&nbsp;&nbsp;
                        <b>{result.filename}</b>&nbsp;&middot;&nbsp;chunk {result.chunk_index}
                    </span>
                    <span class="pi-score">match {relevance_pct:.0f}% &middot; distance {result.distance:.3f} ({relevant_note})</span>
                </div>
                <div class="pi-chunk-text" style="margin-top:10px;">{result.text}</div>
            </div>
            """
        )
elif not query:
    empty_state("Type a question above, or click one of the example queries, then search.")
