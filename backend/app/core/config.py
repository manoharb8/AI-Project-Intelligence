"""Fixed retrieval/chunk settings; intentionally absent from the user interface."""
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
# Load the project-root .env independently of the shell's current directory.
# Existing process environment values win, and missing python-dotenv is safe for
# lightweight source inspection; it is included in the supported requirements.
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / '.env', override=False)
except ImportError:
    pass

DATA_DIR = Path(os.getenv('DATA_DIR', str(Path(__file__).resolve().parents[2] / 'data')))
CHUNK_WORDS = 180
CHUNK_OVERLAP = 30
EMBEDDING_DIM = 256
COLLECTION_NAME = 'project_wordllama_l2_supercat_256_v1'
MIN_SIMILARITY = 0.16
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_BATCH_FILES = 20
SUPPORTED_FORMATS = ('pdf', 'docx', 'csv', 'txt', 'psd')
