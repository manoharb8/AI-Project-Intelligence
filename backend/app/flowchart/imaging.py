"""Validate and normalise uploaded diagrams before any model sees them.

Typical reasons a vision model "cannot read" a PNG flowchart are handled here:
transparent backgrounds (black text on transparent becomes black on black),
16-bit or palette PNGs, oversized or tiny images, blank files, and files whose
extension does not match their content.
"""
import base64
import io
import math
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageOps, ImageStat, UnidentifiedImageError

from app.flowchart import settings

MAX_PIXELS = 40_000_000          # decoded size guard (decompression bombs)
MIN_SIDE = 48                    # smaller than this cannot contain a readable diagram
MIN_LONG_EDGE = 700              # small images are upscaled so text is legible
MAX_ENCODED_BYTES = 3_500_000    # ~4.7 MB as base64, under every provider limit

PNG_MAGIC = b'\x89PNG\r\n\x1a\n'


class ImageProblem(ValueError):
    """The message is safe and meant to be shown to the person who uploaded the file."""


@dataclass(frozen=True)
class PreparedImage:
    data: bytes
    media_type: str
    width: int
    height: int
    notes: tuple = ()

    @property
    def base64(self):
        return base64.b64encode(self.data).decode('ascii')

    @property
    def data_url(self):
        return f'data:{self.media_type};base64,{self.base64}'


def detect_kind(data: bytes):
    """Identify the real type from the bytes, never from the file name."""
    if data[:8] == PNG_MAGIC:
        return 'png'
    if data[:3] == b'\xff\xd8\xff':
        return 'jpeg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    if b'%PDF-' in data[:1024]:
        return 'pdf'
    return None


def _has_alpha(img):
    return img.mode in ('RGBA', 'LA', 'PA', 'RGBa', 'La') or (img.mode == 'P' and 'transparency' in img.info)


def _to_rgb(img):
    """Always produce plain 8-bit RGB, handling transparency and high bit depth."""
    if img.mode in ('I;16', 'I;16L', 'I;16B', 'I', 'F'):
        values = np.asarray(img, dtype=np.float64)
        top = 65535.0 if img.mode.startswith('I;16') else max(float(values.max()), 1.0)
        return Image.fromarray(np.clip(values / top * 255.0, 0, 255).astype(np.uint8), 'L').convert('RGB')
    if _has_alpha(img):
        rgba = img.convert('RGBA')
        alpha = np.asarray(rgba.getchannel('A'), dtype=np.float64) / 255.0
        luminance = np.asarray(rgba.convert('L'), dtype=np.float64)
        weight = alpha.sum()
        # Light artwork on a transparent background (exported from a dark theme)
        # would vanish on white, so it is placed on a dark background instead.
        light_artwork = weight > 0 and float((luminance * alpha).sum() / weight) > 200
        background = Image.new('RGBA', rgba.size, (24, 24, 24, 255) if light_artwork else (255, 255, 255, 255))
        return Image.alpha_composite(background, rgba).convert('RGB')
    return img.convert('RGB')


def _encode(img):
    buffer = io.BytesIO()
    img.save(buffer, 'PNG', optimize=True)
    data = buffer.getvalue()
    if len(data) <= MAX_ENCODED_BYTES:
        return data, 'image/png'
    for quality in (90, 80, 70):
        buffer = io.BytesIO()
        img.save(buffer, 'JPEG', quality=quality, optimize=True)
        if buffer.tell() <= MAX_ENCODED_BYTES:
            return buffer.getvalue(), 'image/jpeg'
    return None, None


def prepare_pil(img: Image.Image, max_edge: int | None = None) -> PreparedImage:
    max_edge = max_edge or settings.max_edge()
    notes = []
    img = ImageOps.exif_transpose(img)
    if _has_alpha(img):
        notes.append('Transparent background was flattened so the diagram stays readable.')
    img = _to_rgb(img)
    width, height = img.size
    if min(width, height) < MIN_SIDE:
        raise ImageProblem(f'The image is too small to contain a readable flowchart ({width}×{height}px). Upload a larger export.')
    gray = img.convert('L')
    if ImageStat.Stat(gray).stddev[0] < 1.5:
        raise ImageProblem('The image appears to be blank (one uniform colour). Check the export and upload it again.')
    longest = max(width, height)
    if longest > max_edge:
        scale = max_edge / longest
    elif longest < MIN_LONG_EDGE:
        scale = min(2.0, 1000 / longest)
    else:
        scale = 1.0
    if scale != 1.0:
        img = img.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.Resampling.LANCZOS)
        notes.append(f'Resized from {width}×{height}px to {img.size[0]}×{img.size[1]}px for analysis.')
    for _ in range(4):
        data, media_type = _encode(img)
        if data is not None:
            return PreparedImage(data, media_type, img.size[0], img.size[1], tuple(notes))
        img = img.resize((round(img.size[0] * 0.75), round(img.size[1] * 0.75)), Image.Resampling.LANCZOS)
        notes.append('Reduced further to stay within the upload size limit.')
    raise ImageProblem('The image is too detailed to prepare for analysis. Export a smaller or simpler version.')


def prepare_image(data: bytes, max_edge: int | None = None) -> PreparedImage:
    try:
        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
            if width * height > MAX_PIXELS:
                raise ImageProblem(f'The image is too large ({width}×{height}px). Export it at a smaller size.')
            if img.format not in ('PNG', 'JPEG', 'WEBP'):
                raise ImageProblem('Unsupported image type. Upload a PNG, JPEG or WebP image, or a PDF.')
            img.load()
            return prepare_pil(img, max_edge)
    except ImageProblem:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError, SyntaxError) as exc:
        raise ImageProblem('The image could not be read. It may be corrupted or incomplete. Export it again and retry.') from exc


def render_pdf(data: bytes, max_pages: int | None = None):
    """Rasterise the first pages of a PDF. Returns (page_images, total_page_count)."""
    import pypdfium2 as pdfium
    max_pages = max_pages or settings.pdf_max_pages()
    try:
        pdf = pdfium.PdfDocument(data)
    except pdfium.PdfiumError as exc:
        if 'password' in str(exc).lower():
            raise ImageProblem('Encrypted PDFs are not supported. Upload an unlocked copy.') from exc
        raise ImageProblem('The PDF could not be read. It may be corrupted or incomplete.') from exc
    try:
        total = len(pdf)
        if total == 0:
            raise ImageProblem('The PDF has no pages.')
        pages = []
        for index in range(min(total, max_pages)):
            page = pdf[index]
            try:
                width, height = page.get_size()
                scale = max(1.0, min(3.0, 2000 / max(width, height)))
                scale = max(0.1, min(scale, math.sqrt(MAX_PIXELS / max(width * height, 1))))
                pages.append(page.render(scale=scale).to_pil().copy())
            except ImageProblem:
                raise
            except Exception as exc:  # pdfium raises several unrelated error types
                raise ImageProblem(f'Page {index + 1} of the PDF could not be rendered.') from exc
            finally:
                page.close()
        return pages, total
    finally:
        pdf.close()
