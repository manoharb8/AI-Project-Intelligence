from rag_pipeline.embeddings import EmbeddingGenerator
from rag_pipeline.models import Chunk
from rag_pipeline.vector_store import ChromaVectorStore


def _make_chunk(idx: int, text: str, filename: str = "sample.txt") -> Chunk:
    return Chunk(
        chunk_id=f"chunk_{idx}",
        doc_id="doc_1",
        filename=filename,
        file_type="txt",
        chunk_index=idx,
        text=text,
    )


def test_add_and_count(temp_chroma_dir):
    store = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="test_collection")
    generator = EmbeddingGenerator()

    chunks = [_make_chunk(0, "project risk report"), _make_chunk(1, "sprint task list")]
    embeddings = generator.embed([c.text for c in chunks])

    assert store.count() == 0
    store.add_chunks(chunks, embeddings)
    assert store.count() == 2


def test_query_returns_metadata(temp_chroma_dir):
    store = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="test_collection")
    generator = EmbeddingGenerator()

    chunks = [
        _make_chunk(0, "the project has a high risk of delay", "risk_report.pdf"),
        _make_chunk(1, "sprint task list with several open items", "tasks.csv"),
    ]
    embeddings = generator.embed([c.text for c in chunks])
    store.add_chunks(chunks, embeddings)

    query_embedding = generator.embed_one("what is the project risk")
    result = store.query(query_embedding, top_k=1)

    assert result["ids"][0][0] == "chunk_0"
    assert result["metadatas"][0][0]["filename"] == "risk_report.pdf"


def test_persistence_across_client_instances(temp_chroma_dir):
    generator = EmbeddingGenerator()
    chunks = [_make_chunk(0, "persisted chunk content"), _make_chunk(1, "another chunk of text")]
    embeddings = generator.embed([c.text for c in chunks])

    store1 = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="persist_test")
    store1.add_chunks(chunks, embeddings)
    assert store1.count() == 2

    store2 = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="persist_test")
    assert store2.count() == 2


def test_clear_removes_all_chunks(temp_chroma_dir):
    store = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="clear_test")
    generator = EmbeddingGenerator()
    chunks = [_make_chunk(0, "chunk one"), _make_chunk(1, "chunk two")]
    embeddings = generator.embed([c.text for c in chunks])
    store.add_chunks(chunks, embeddings)
    assert store.count() == 2

    store.clear()
    assert store.count() == 0


def test_list_sources(temp_chroma_dir):
    store = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="sources_test")
    generator = EmbeddingGenerator()
    chunks = [
        _make_chunk(0, "chunk from file a", filename="a.txt"),
        _make_chunk(1, "chunk from file b", filename="b.txt"),
    ]
    embeddings = generator.embed([c.text for c in chunks])
    store.add_chunks(chunks, embeddings)

    assert store.list_sources() == ["a.txt", "b.txt"]
