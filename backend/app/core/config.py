"""Fixed retrieval/chunk settings; intentionally absent from the user interface."""
import os
from pathlib import Path

DATA_DIR = Path(os.getenv('DATA_DIR', str(Path(__file__).resolve().parents[2] / 'data')))
CHUNK_WORDS = 180
CHUNK_OVERLAP = 30
EMBEDDING_DIM = 256
COLLECTION_NAME = 'project_wordllama_l2_supercat_256_v1'
MIN_SIMILARITY = 0.16
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_BATCH_FILES = 20
SUPPORTED_FORMATS = ('pdf', 'docx', 'csv', 'txt')
