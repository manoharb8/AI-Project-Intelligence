"""Data carriers required by the frozen historical regression tests."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    doc_id: str
    filename: str
    file_type: str
    chunk_index: int
    text: str


@dataclass(frozen=True)
class ProcessingResult:
    filename: str
    status: str
    message: str


@dataclass(frozen=True)
class RetrievalResult:
    chunk_id: str
    filename: str
    text: str
    distance: float
    is_relevant: bool
