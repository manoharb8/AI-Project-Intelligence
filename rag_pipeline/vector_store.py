"""Legacy store interface backed by the unified KnowledgeBaseService.

No application route uses this adapter. Tests supply their own temporary data
directories. Named collections preserve the historical test API.
"""
from app.services.knowledge_base import KnowledgeBaseService


class ChromaVectorStore(KnowledgeBaseService):
    def __init__(self, persist_directory, collection_name):
        super().__init__(persist_directory, embeddings=None)
        self.collection = self.client.get_or_create_collection(collection_name,
            metadata={'hnsw:space':'cosine'}, embedding_function=None)

    def count(self):
        return self.collection.count()

    def add_chunks(self, chunks, embeddings):
        if not chunks:
            return
        self.collection.add(ids=[c.chunk_id for c in chunks], documents=[c.text for c in chunks], embeddings=embeddings,
            metadatas=[dict(document_id=c.doc_id, filename=c.filename, document_type=c.file_type,
                           chunk_id=c.chunk_id, chunk_number=c.chunk_index+1, location=f'Chunk {c.chunk_index+1}') for c in chunks])

    def query(self, query_embedding, top_k=5):
        if not self.count():
            return {'ids':[[]], 'documents':[[]], 'metadatas':[[]], 'distances':[[]]}
        return self.collection.query(query_embeddings=[query_embedding], n_results=min(top_k,self.count()), include=['documents','metadatas','distances'])

    def clear(self):
        ids = self.collection.get()['ids']
        if ids:
            self.collection.delete(ids=ids)
        self.documents = []
        self._save()

    def list_sources(self):
        return sorted({meta['filename'] for meta in self.collection.get()['metadatas']})
