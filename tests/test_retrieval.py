import pytest

from rag_pipeline.embeddings import EmbeddingGenerator
from rag_pipeline.pipeline import process_documents
from rag_pipeline.retrieval import has_sufficient_information, retrieve
from rag_pipeline.vector_store import ChromaVectorStore

SAMPLE_FILES = [
    "project_proposal.pdf",
    "project_requirements.docx",
    "sprint_update.txt",
    "task_list.csv",
    "project_risk_report.pdf",
    "meeting_notes.docx",
]


@pytest.fixture
def indexed_store(sample_docs_dir, temp_chroma_dir):
    """Process every real sample document through the full pipeline and index it."""
    generator = EmbeddingGenerator()
    store = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="retrieval_test")

    files = [(str(sample_docs_dir / filename), filename) for filename in SAMPLE_FILES]
    results = process_documents(files, generator, store)

    for result in results:
        assert result.status == "success", f"Failed to process {result.filename}: {result.message}"

    return generator, store


def test_all_sample_documents_indexed(indexed_store):
    _, store = indexed_store
    assert store.count() > 0
    assert set(store.list_sources()) == set(SAMPLE_FILES)


# ---------------------------------------------------------------------------
# Regression tests for the manual-testing bug report:
#
#   Query "Which tasks are incomplete?" returned distance=1.0 (0% match)
#   against every indexed chunk, including task_list.csv, because the
#   previous TF-IDF-based embedding only matched exact tokens and
#   "incomplete" never appears verbatim in the corpus (which uses
#   "Not Started" / "In Progress"). The same distance=1.0 pattern was
#   indistinguishable from a genuinely out-of-scope query, which is the
#   core problem: relevant and irrelevant queries must NOT look the same.
#
# These four tests pin down exactly the queries from that report, and
# assert both that the right documents come back AND that distances are
# not saturated at a meaningless 1.0.
# ---------------------------------------------------------------------------


def test_regression_project_risks_query(indexed_store):
    generator, store = indexed_store
    results = retrieve("What are the current project risks?", generator, store, top_k=5)
    assert has_sufficient_information(results)
    relevant_files = {r.filename for r in results if r.is_relevant}
    assert "project_risk_report.pdf" in relevant_files
    assert results[0].distance < 1.0


def test_regression_incomplete_tasks_query(indexed_store):
    """
    The exact query that surfaced the bug. task_list.csv describes task
    status as "Not Started" / "In Progress", never the word "incomplete" -
    a purely lexical embedding cannot bridge that gap (confirmed distance
    was exactly 1.0 for every chunk under the previous implementation).
    """
    generator, store = indexed_store
    results = retrieve("Which tasks are incomplete?", generator, store, top_k=5)
    assert has_sufficient_information(results)
    assert results[0].distance < 1.0, (
        "Distance is saturated at 1.0 - the embedding model is not "
        "capturing any relationship between 'incomplete' and the "
        "corpus's actual wording ('Not Started' / 'In Progress')."
    )
    relevant_files = {r.filename for r in results if r.is_relevant}
    assert "task_list.csv" in relevant_files


def test_regression_blockers_query(indexed_store):
    generator, store = indexed_store
    results = retrieve("What are the major project blockers?", generator, store, top_k=5)
    assert has_sufficient_information(results)
    assert results[0].distance < 1.0


def test_regression_out_of_scope_query_still_rejected(indexed_store):
    """
    The fix for the "incomplete tasks" case must not come at the cost of
    the insufficient-information guard: a genuinely out-of-scope query
    must still be rejected, and its best match must score clearly worse
    than the in-scope queries above (not just barely worse).
    """
    generator, store = indexed_store
    results = retrieve("Who is the Prime Minister of India?", generator, store, top_k=5)
    assert not has_sufficient_information(results)
    assert results[0].distance > 0.85


def test_incomplete_and_out_of_scope_queries_are_distinguishable(indexed_store):
    """
    The core defect: under TF-IDF, "Which tasks are incomplete?" and a
    genuinely out-of-scope query both scored distance=1.0 and were
    indistinguishable. After the fix, the in-scope query's best match
    must score meaningfully better (lower distance) than the
    out-of-scope query's best match.
    """
    generator, store = indexed_store
    incomplete_results = retrieve("Which tasks are incomplete?", generator, store, top_k=1)
    out_of_scope_results = retrieve("Who is the Prime Minister of India?", generator, store, top_k=1)

    assert incomplete_results[0].distance < out_of_scope_results[0].distance
    assert incomplete_results[0].is_relevant
    assert not out_of_scope_results[0].is_relevant


# ---------------------------------------------------------------------------
# General retrieval behavior (unchanged from before, re-verified against
# the new embedding model)
# ---------------------------------------------------------------------------


def test_multi_document_retrieval_returns_multiple_sources(indexed_store):
    generator, store = indexed_store
    results = retrieve(
        "Tell me about the project sprint progress, risks and tasks",
        generator,
        store,
        top_k=6,
    )
    sources = {r.filename for r in results}
    assert len(sources) >= 2


def test_retrieval_includes_relevance_scores(indexed_store):
    generator, store = indexed_store
    results = retrieve("What are the project deliverables?", generator, store, top_k=3)
    for result in results:
        assert isinstance(result.distance, float)
        assert result.chunk_id
        assert result.filename


def test_insufficient_information_for_out_of_scope_query(indexed_store):
    generator, store = indexed_store
    results = retrieve(
        "What is the recipe for making a chocolate lava cake?",
        generator,
        store,
        top_k=5,
    )
    assert not has_sufficient_information(results)


def test_empty_store_returns_no_results(temp_chroma_dir):
    generator = EmbeddingGenerator()
    empty_store = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="empty_test")
    results = retrieve("any query at all", generator, empty_store, top_k=5)
    assert results == []


# ---------------------------------------------------------------------------
# Restart-survival: a freshly-constructed EmbeddingGenerator (simulating
# a new Streamlit session / app restart) must retrieve correctly against
# a vector store that was indexed by a *different* EmbeddingGenerator
# instance in a previous "session". This was not guaranteed to matter
# under TF-IDF (where the fitted vocabulary lived only in memory) but is
# an explicit requirement now.
# ---------------------------------------------------------------------------


def test_query_survives_fresh_embedding_generator_instance(sample_docs_dir, temp_chroma_dir):
    indexing_generator = EmbeddingGenerator()
    store = ChromaVectorStore(persist_directory=temp_chroma_dir, collection_name="restart_test")
    files = [(str(sample_docs_dir / filename), filename) for filename in SAMPLE_FILES]
    process_documents(files, indexing_generator, store)

    # Simulate a new session / app restart: a brand new generator instance,
    # never exposed to the indexing batch.
    query_generator = EmbeddingGenerator()
    results = retrieve("Which tasks are incomplete?", query_generator, store, top_k=5)

    assert has_sufficient_information(results)
    assert "task_list.csv" in {r.filename for r in results if r.is_relevant}
