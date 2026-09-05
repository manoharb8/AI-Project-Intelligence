"""
Shared Streamlit session-state setup.

Every page calls init_session_state() first, so the embedding generator,
vector store and last processing results are consistent across page
switches within one browser session.

The embedding model (see rag_pipeline/embeddings.py) is a fixed,
pretrained model with no per-corpus fitting step, so - unlike an
earlier TF-IDF-based implementation - a freshly created
EmbeddingGenerator in a new session or after an app restart produces
identical vectors to any previous session for the same text. Querying
the persisted Chroma vector store therefore works correctly right after
a restart, with no need to re-process documents first.
"""

from pathlib import Path

import streamlit as st

from rag_pipeline.embeddings import EmbeddingGenerator
from rag_pipeline.vector_store import ChromaVectorStore

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PERSIST_DIRECTORY = str(PROJECT_ROOT / "chroma_db")

# Chunking is fixed for Milestone 1 - not user-configurable. These are the
# only values passed to rag_pipeline.pipeline.process_documents(); see
# app/pages/1_Upload_and_Process.py.
CHUNK_SIZE = 220
CHUNK_OVERLAP = 40


def init_session_state() -> None:
    if "vector_store" not in st.session_state:
        st.session_state.vector_store = ChromaVectorStore(persist_directory=PERSIST_DIRECTORY)

    if "embedding_generator" not in st.session_state:
        st.session_state.embedding_generator = EmbeddingGenerator()

    if "processing_results" not in st.session_state:
        st.session_state.processing_results = []

    if "pending_uploads" not in st.session_state:
        st.session_state.pending_uploads = []


def embedding_ready() -> bool:
    """
    True if an embedding model is available in this session.

    Kept for backward compatibility with existing page code. Always
    True in practice once init_session_state() has run, since the
    embedding model requires no fitting - see the module docstring.
    """
    return bool(st.session_state.get("embedding_generator"))


def knowledge_base_populated() -> bool:
    """True if the persisted vector store currently holds any chunks."""
    store = st.session_state.get("vector_store")
    return bool(store and store.count() > 0)
