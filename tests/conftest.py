import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

SAMPLE_DOCS_DIR = PROJECT_ROOT / "data" / "sample_documents"


@pytest.fixture
def sample_docs_dir() -> Path:
    return SAMPLE_DOCS_DIR


@pytest.fixture
def temp_chroma_dir(tmp_path):
    return str(tmp_path / "chroma_test_db")
