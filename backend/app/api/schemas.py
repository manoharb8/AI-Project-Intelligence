from typing import Literal
from pydantic import BaseModel, Field, field_validator

class DocumentRecord(BaseModel):
    id: str
    filename: str
    document_type: str
    size_bytes: int
    uploaded_at: str
    status: Literal['processing', 'indexed', 'error']
    chunk_count: int = 0
    indexed: bool = False
    error: str | None = None

class UploadResult(BaseModel):
    documents: list[DocumentRecord]

class KnowledgeBase(BaseModel):
    document_count: int
    indexed_documents: int
    chunk_count: int
    supported_formats: list[str]
    retrieval_ready: bool
    documents: list[DocumentRecord]

class Query(BaseModel):
    query: str = Field(min_length=2, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=10)

    @field_validator('query')
    @classmethod
    def trim_query(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Enter a question with at least two non-space characters.')
        return value

class Evidence(BaseModel):
    id: str
    document_id: str
    filename: str
    document_type: str
    chunk_number: int
    location: str
    text: str
    similarity: float

class QueryResult(BaseModel):
    status: Literal['ok', 'insufficient_information']
    message: str
    query: str
    results: list[Evidence]

class Health(BaseModel):
    status: str
    embedding_model: str
    vector_store: str
