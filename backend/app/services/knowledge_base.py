"""Persistent vector knowledge base with atomic document manifests.

Single-process demo service. A lock coordinates ingestion and queries; readers
can still see per-file processing status. Chroma stores all vectors and evidence.
"""
import json
import logging
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
import chromadb
from chromadb.config import Settings
from app.core.config import COLLECTION_NAME, MIN_SIMILARITY, SUPPORTED_FORMATS
from app.services.text import extract, chunks
from app.services.embeddings import EmbeddingService

log = logging.getLogger(__name__)

class KnowledgeBaseService:
    def __init__(self, data_dir: Path, embeddings: EmbeddingService):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.embeddings = embeddings
        self.ingestion_lock = threading.RLock()
        self.manifest_lock = threading.RLock()
        self.manifest_path = self.data_dir / 'documents.json'
        self.client = chromadb.PersistentClient(path=str(self.data_dir / 'chroma'), settings=Settings(anonymized_telemetry=False))
        self.collection = self.client.get_or_create_collection(COLLECTION_NAME, metadata={'hnsw:space': 'cosine'}, embedding_function=None)
        self.documents = json.loads(self.manifest_path.read_text()) if self.manifest_path.exists() else []
        for doc in self.documents:
            if doc['status'] == 'processing':
                self.collection.delete(where={'document_id': doc['id']})
                doc.update(status='error', error='Processing was interrupted. Please upload this file again.', indexed=False, chunk_count=0)
        self._save()

    def _save(self):
        temp = self.manifest_path.with_suffix('.tmp')
        temp.write_text(json.dumps(self.documents, indent=2), encoding='utf-8')
        temp.replace(self.manifest_path)

    def list_documents(self):
        with self.manifest_lock:
            return [dict(d) for d in self.documents]

    def ingest(self, filename: str, data: bytes, upload_error: str | None = None):
        filename = Path(filename.replace('\\', '/')).name[:200] or 'unnamed'
        kind = Path(filename).suffix.lower().lstrip('.')
        doc = dict(id=uuid.uuid4().hex, filename=filename, document_type=kind, size_bytes=len(data),
                   uploaded_at=datetime.now(timezone.utc).isoformat(), status='processing', chunk_count=0, indexed=False, error=None)
        with self.manifest_lock:
            self.documents.append(doc)
            self._save()
        with self.ingestion_lock:
            try:
                if upload_error:
                    raise ValueError(upload_error)
                if kind not in SUPPORTED_FORMATS:
                    raise ValueError('Unsupported format. Use PDF, DOCX, CSV, or TXT.')
                units = extract(data, kind)
                texts, metadata, ids = [], [], []
                for unit in units:
                    for content in chunks(unit.text):
                        number = len(texts) + 1
                        chunk_id = f'{doc["id"]}:chunk-{number}'
                        texts.append(content)
                        ids.append(chunk_id)
                        metadata.append(dict(document_id=doc['id'], filename=filename, document_type=kind,
                                             chunk_id=chunk_id, chunk_number=number, location=unit.location))
                # Batches bound peak embedding memory and respect Chroma batch limits.
                for start in range(0, len(texts), 64):
                    batch = texts[start:start + 64]
                    self.collection.add(ids=ids[start:start + 64], documents=batch,
                                        embeddings=self.embeddings.embed(batch), metadatas=metadata[start:start + 64])
                with self.manifest_lock:
                    doc.update(status='indexed', indexed=True, chunk_count=len(texts))
                    self._save()
            except Exception as exc:
                self.collection.delete(where={'document_id': doc['id']})
                log.warning('Document ingestion failed: %s', filename, exc_info=True)
                message = str(exc) if isinstance(exc, (ValueError, UnicodeDecodeError)) else 'Unable to read or index this file. Check the file and try again.'
                with self.manifest_lock:
                    doc.update(status='error', error=message, indexed=False, chunk_count=0)
                    self._save()
        return dict(doc)

    def summary(self):
        documents = self.list_documents()
        indexed = [d for d in documents if d['indexed']]
        return dict(document_count=len(documents), indexed_documents=len(indexed),
                    chunk_count=sum(d['chunk_count'] for d in indexed), supported_formats=list(SUPPORTED_FORMATS),
                    retrieval_ready=bool(indexed), documents=documents)

    def query(self, question: str, top_k: int = 5):
        result = dict(status='insufficient_information', message='Insufficient information: no relevant evidence was found in the indexed documents.', query=question, results=[])
        with self.ingestion_lock:
            count = self.collection.count()
            if not count:
                result['message'] = 'Insufficient information: upload and index project documents first.'
                return result
            found = self.collection.query(query_embeddings=self.embeddings.embed([question]), n_results=min(top_k, count), include=['documents', 'metadatas', 'distances'])
            for ident, text, meta, distance in zip(found['ids'][0], found['documents'][0], found['metadatas'][0], found['distances'][0]):
                score = max(-1.0, min(1.0, 1.0 - float(distance)))
                if score >= MIN_SIMILARITY:
                    result['results'].append(dict(id=ident, document_id=meta['document_id'], filename=meta['filename'],
                        document_type=meta['document_type'], chunk_number=meta['chunk_number'], location=meta['location'], text=text, similarity=round(score, 4)))
        if result['results']:
            result.update(status='ok', message='Relevant source passages. Similarity measures relatedness, not factual confidence; review the evidence for your question.')
        return result
