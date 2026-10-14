from rag_pipeline.embeddings import EmbeddingGenerator


def test_embed_returns_one_vector_per_text():
    generator = EmbeddingGenerator()
    vectors = generator.embed(["project risk report", "sprint task list"])
    assert len(vectors) == 2
    assert all(len(vec) == generator.dimensions for vec in vectors)


def test_no_fitting_required():
    """Unlike the previous TF-IDF implementation, embedding requires no fit step."""
    generator = EmbeddingGenerator()
    assert generator.is_fitted is True
    # embed() works immediately, with no prior fit()/fit_transform() call.
    vector = generator.embed_one("no fitting needed")
    assert len(vector) == generator.dimensions


def test_embed_empty_list_returns_empty():
    generator = EmbeddingGenerator()
    assert generator.embed([]) == []


def test_embed_is_deterministic():
    """The same text must embed to the same vector every time (fixed pretrained model)."""
    generator = EmbeddingGenerator()
    vec1 = generator.embed_one("project deliverables and milestones")
    vec2 = generator.embed_one("project deliverables and milestones")
    assert vec1 == vec2


def test_embed_is_deterministic_across_separate_instances():
    """
    A second, independently-constructed EmbeddingGenerator must produce
    identical vectors for the same text as the first. This is what lets
    a fresh Streamlit session (after an app restart) query a knowledge
    base indexed by a previous session without re-processing anything.
    """
    generator_a = EmbeddingGenerator()
    generator_b = EmbeddingGenerator()
    text = "task status: not started, in progress"
    assert generator_a.embed_one(text) == generator_b.embed_one(text)


def test_vectors_are_l2_normalized():
    import math

    generator = EmbeddingGenerator()
    vector = generator.embed_one("some project text")
    norm = math.sqrt(sum(x * x for x in vector))
    assert abs(norm - 1.0) < 1e-6


def test_semantically_related_text_is_closer_than_unrelated_text():
    """
    This is the property TF-IDF lacked: "incomplete" and "not started"
    describe the same real-world fact using different words, and a
    genuinely semantic embedding should place them closer together than
    two unrelated pieces of text - even though they share zero exact
    tokens.
    """
    generator = EmbeddingGenerator()
    incomplete_task_query = generator.embed_one("incomplete tasks")
    not_started_status = generator.embed_one("task status: not started, in progress")
    unrelated_text = generator.embed_one("chocolate chip cookie recipe with butter and sugar")

    def cosine_distance(a, b):
        dot = sum(x * y for x, y in zip(a, b))
        return 1 - dot  # vectors are already L2-normalized

    assert cosine_distance(incomplete_task_query, not_started_status) < cosine_distance(
        incomplete_task_query, unrelated_text
    )
