"""Extract source units and normalize without losing page/row provenance."""
import csv
import io
import re
import unicodedata
import zipfile
import subprocess
import warnings
from dataclasses import dataclass
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from PIL import Image, ImageOps, UnidentifiedImageError
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



def _extract_psd_text(data: bytes) -> list[SourceUnit]:
    """Rasterize a PSD composite and OCR visible text without writing user files.

    Pillow's PSD reader handles the flattened/composite preview. Tesseract is an
    optional system executable; if it is not installed we return a clear error
    rather than marking an image-only document as successfully indexed.
    """
    if not data.startswith(b'8BPS'):
        raise ValueError('The file extension is PSD, but the file does not have a valid Photoshop PSD signature.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(data))
            if image.format != 'PSD':
                raise ValueError('The uploaded file is not a readable PSD composite.')
            if image.width < 1 or image.height < 1 or image.width * image.height > 40_000_000:
                raise ValueError('PSD composite dimensions are invalid or exceed the 40-megapixel safety limit.')
            image.load()
            image = ImageOps.exif_transpose(image).convert('RGB')
            stream = io.BytesIO()
            image.save(stream, format='PNG', optimize=True)
    except ValueError:
        raise
    except (UnidentifiedImageError, OSError, EOFError, SyntaxError, Image.DecompressionBombError,
            Image.DecompressionBombWarning) as exc:
        raise ValueError('The PSD is corrupt or its composite image could not be decoded.') from exc
    try:
        result = subprocess.run(
            ['tesseract', 'stdin', 'stdout', '--psm', '3'], input=stream.getvalue(),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20, check=False)
    except FileNotFoundError as exc:
        raise ValueError('PSD composite extracted, but OCR is unavailable. Install Tesseract OCR or export the PSD as a text-readable PDF/TXT file.') from exc
    except subprocess.TimeoutExpired as exc:
        raise ValueError('PSD text recognition timed out. Try a smaller or simpler PSD composite.') from exc
    if result.returncode != 0:
        raise ValueError('PSD composite extracted, but OCR failed. Check the Tesseract installation or export a text-readable PDF/TXT file.')
    text = result.stdout.decode('utf-8', errors='replace').strip()
    if len(re.sub(r'[^\w]', '', text, flags=re.UNICODE)) < 4:
        raise ValueError('No readable text was found in this PSD composite. Export the document as PDF/TXT or use Flowchart Analysis for a visual diagram.')
    return [SourceUnit(text, 'PSD composite (OCR)')]

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
    elif kind == 'psd':
        units = _extract_psd_text(data)
    else:
        raise ValueError('Unsupported format. Use PDF, DOCX, CSV, TXT, or PSD.')
    units = [SourceUnit(normalize(u.text), u.location) for u in units if normalize(u.text)]
    if not units:
        raise ValueError('No readable text found. Scanned PDFs need OCR before upload.')
    return units
