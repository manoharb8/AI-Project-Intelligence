import pytest

from rag_pipeline.ingestion import (
    UnsupportedFileTypeError,
    extract_text,
    get_file_type,
)


def test_txt_ingestion(sample_docs_dir):
    text = extract_text(str(sample_docs_dir / "sprint_update.txt"), "sprint_update.txt")
    assert "Sprint 3 Update" in text
    assert "Chroma vector store integration" in text


def test_pdf_ingestion(sample_docs_dir):
    text = extract_text(str(sample_docs_dir / "project_proposal.pdf"), "project_proposal.pdf")
    assert "Project Proposal" in text
    assert "Retrieval-Augmented" in text or "Retrieval-Augmented".replace("-", "") in text.replace("-", "")


def test_docx_ingestion(sample_docs_dir):
    text = extract_text(
        str(sample_docs_dir / "project_requirements.docx"), "project_requirements.docx"
    )
    assert "Functional Requirements" in text
    assert "FR1" in text


def test_csv_ingestion(sample_docs_dir):
    text = extract_text(str(sample_docs_dir / "task_list.csv"), "task_list.csv")
    # Each row is rendered as "Column: value" pairs, so the header appears
    # as a label prefix but the raw header row itself is not duplicated.
    assert "Task ID: T-01" in text
    assert "Manohar" in text
    assert text.count("Task ID:") == 11  # one per data row, header row consumed


def test_unsupported_file_type_raises(sample_docs_dir):
    with pytest.raises(UnsupportedFileTypeError):
        extract_text(str(sample_docs_dir / "task_list.csv"), "task_list.xyz")


def test_get_file_type():
    assert get_file_type("report.PDF") == "pdf"
    assert get_file_type("notes.docx") == "docx"
    assert get_file_type("data.csv") == "csv"
    assert get_file_type("log.txt") == "txt"
