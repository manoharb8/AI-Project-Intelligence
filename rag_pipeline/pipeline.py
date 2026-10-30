"""Historical whole-document interface composed from unified service adapters.

Legacy callers consume plain text, without the source-unit API. This compatibility
path indexes fixed windows of that text. The app continues indexing source units
with page/paragraph/row locations through KnowledgeBaseService.ingest unchanged.
"""
import uuid
from rag_pipeline.models import Chunk, ProcessingResult
from rag_pipeline.ingestion import extract_text, get_file_type
from rag_pipeline.chunking import chunk_text


def process_documents(files, generator, store):
    results = []
    for path, filename in files:
        try:
            texts = chunk_text(extract_text(path, filename))
            doc_id = uuid.uuid4().hex
            chunks = [Chunk(f'{doc_id}:{i}', doc_id, filename, get_file_type(filename), i, text) for i, text in enumerate(texts)]
            store.add_chunks(chunks, generator.embed(texts))
            results.append(ProcessingResult(filename, 'success', 'Indexed.'))
        except (ValueError, OSError) as error:
            results.append(ProcessingResult(filename, 'error', str(error)))
    return results
