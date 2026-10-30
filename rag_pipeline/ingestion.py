"""Historical path-based interface over the same PDF/DOCX/CSV/TXT extractor."""
from pathlib import Path
from app.core.config import SUPPORTED_FORMATS
from app.services.text import extract


class UnsupportedFileTypeError(ValueError):
    pass


def get_file_type(filename):
    kind = Path(filename).suffix.lower().lstrip('.')
    if kind not in SUPPORTED_FORMATS:
        raise UnsupportedFileTypeError('Use PDF, DOCX, CSV, or TXT.')
    return kind


def extract_text(path, filename):
    kind = get_file_type(filename)
    return '\n'.join(unit.text for unit in extract(Path(path).read_bytes(), kind))
