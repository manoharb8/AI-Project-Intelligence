"""
Data models shared across the RAG pipeline stages.

Keeping these as plain dataclasses (rather than dicts) gives every stage a
single, typed contract to read and write, which makes the pipeline easier to
test and to extend in later milestones.
"""

from dataclasses import dataclass


@dataclass
class Document:
    """A single uploaded project artifact after text extraction."""

    doc_id: str
    filename: str
    file_type: str  # "pdf" | "docx" | "csv" | "txt"
    raw_text: str
    normalized_text: str = ""

    @property
    def character_count(self) -> int:
        return len(self.normalized_text or self.raw_text)


@dataclass
class Chunk:
    """A chunk of a document, ready to be embedded and indexed."""

    chunk_id: str
    doc_id: str
    filename: str
    file_type: str
    chunk_index: int
    text: str

    @property
    def word_count(self) -> int:
        return len(self.text.split())


@dataclass
class RetrievalResult:
    """A single retrieved chunk, returned in response to a user query."""

    chunk_id: str
    filename: str
    file_type: str
    chunk_index: int
    text: str
    distance: float
    is_relevant: bool
