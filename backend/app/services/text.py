"""Extract source units and normalize without losing page/row provenance."""
import csv
import io
import re
import unicodedata
import zipfile
from dataclasses import dataclass
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from app.core.config import CHUNK_WORDS, CHUNK_OVERLAP

@dataclass(frozen=True)
class SourceUnit:
    text: str
    location: str


def normalize(text: str) -> str:
    text = unicodedata.normalize('NFKC', text).replace('\x00', '')
    return ' '.join(text.split())


def chunks(text: str) -> list[str]:
    words = normalize(text).split()
    result = []
    for start in range(0, len(words), CHUNK_WORDS - CHUNK_OVERLAP):
        result.append(' '.join(words[start:start + CHUNK_WORDS]))
        if start + CHUNK_WORDS >= len(words):
            break
    return result


def extract(data: bytes, kind: str) -> list[SourceUnit]:
    if kind == 'pdf':
        pdf = PdfReader(io.BytesIO(data))
        if pdf.is_encrypted:
            raise ValueError('Encrypted PDFs are not supported. Upload an unlocked copy.')
        units = [SourceUnit(page.extract_text() or '', f'Page {i + 1}') for i, page in enumerate(pdf.pages)]
    elif kind == 'docx':
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if sum(x.file_size for x in archive.infolist()) > 50 * 1024 * 1024:
                raise ValueError('Expanded DOCX exceeds the 50 MB limit.')
        doc = Document(io.BytesIO(data))
        units = []
        for i, block in enumerate(doc.iter_inner_content(), 1):
            if isinstance(block, Paragraph):
                units.append(SourceUnit(block.text, f'Paragraph/block {i}'))
            elif isinstance(block, Table):
                for j, row in enumerate(block.rows, 1):
                    units.append(SourceUnit(' | '.join(c.text for c in row.cells), f'Table {i}, row {j}'))
    elif kind == 'csv':
        text = data.decode('utf-8-sig')
        reader = csv.reader(io.StringIO(text), strict=True)
        headers = next(reader, [])
        if not headers or any(not h.strip() for h in headers) or len(set(headers)) != len(headers):
            raise ValueError('CSV needs a nonempty, unique header for each column.')
        units = []
        for row in reader:
            if not row:
                continue
            if len(row) != len(headers):
                raise ValueError(f'CSV row ending at line {reader.line_num} has an unexpected column count.')
            units.append(SourceUnit('; '.join(f'{k}: {v}' for k, v in zip(headers, row)), f'CSV line {reader.line_num}'))
    elif kind == 'txt':
        text = data.decode('utf-8-sig')
        units = [SourceUnit(t, f'Text section {i + 1}') for i, t in enumerate(re.split(r'\n\s*\n', text))]
    else:
        raise ValueError('Unsupported format. Use PDF, DOCX, CSV, or TXT.')
    units = [SourceUnit(normalize(u.text), u.location) for u in units if normalize(u.text)]
    if not units:
        raise ValueError('No readable text found. Scanned PDFs need OCR before upload.')
    return units
