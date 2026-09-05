"""
rag_pipeline
============

Framework-independent RAG (Retrieval-Augmented Generation) pipeline for the
AI-Driven Enterprise Project Intelligence & Risk Management Platform.

This package has no dependency on Streamlit or any other UI framework.
It can be imported and tested on its own, and reused behind a different
UI (e.g. a future FastAPI service) without any changes.

Pipeline stages, implemented as separate modules:

    ingestion       -> extract raw text from PDF / DOCX / CSV / TXT
    normalization   -> clean and standardize extracted text
    chunking        -> split normalized text into overlapping chunks
    embeddings      -> convert chunks/queries into numeric vectors
    vector_store     -> persist and search vectors with Chroma
    retrieval       -> tie embeddings + vector store into a query API
"""
