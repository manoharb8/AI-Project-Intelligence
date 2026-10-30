"""Per-workspace storage: <workspace folder>/flowcharts/<id>.json plus the prepared image.

Living inside the workspace folder means deleting a workspace removes its
flowchart analyses with it, and one workspace can never read another's.
"""
import base64
import logging
import re
import threading
import uuid
from pathlib import Path

from app.flowchart.schemas import FlowchartAnalysis, FlowchartSummary

log = logging.getLogger(__name__)
ID = re.compile(r'^[a-f0-9]{32}$')
_lock = threading.Lock()


class StoreError(Exception):
    pass


def new_id():
    return uuid.uuid4().hex


def _write(path: Path, data: bytes):
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        temporary.write_bytes(data)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


class FlowchartStore:
    def __init__(self, workspace_dir):
        self.root = Path(workspace_dir) / 'flowcharts'

    def save(self, analysis: FlowchartAnalysis, image: bytes):
        if not ID.fullmatch(analysis.id):
            raise StoreError('Invalid analysis id.')
        try:
            # parents=False: never re-create a workspace folder that was deleted while analysing.
            self.root.mkdir(exist_ok=True)
        except FileNotFoundError as exc:
            raise StoreError('This workspace no longer exists, so the analysis was not saved.') from exc
        record = analysis.model_copy(update={'image_data_url': None})
        with _lock:
            _write(self.root / f'{analysis.id}.img', image)
            _write(self.root / f'{analysis.id}.json', record.model_dump_json(indent=2).encode('utf-8'))

    def _load(self, ident):
        path = self.root / f'{ident}.json'
        return FlowchartAnalysis.model_validate_json(path.read_text(encoding='utf-8'))

    def list(self):
        if not self.root.is_dir():
            return []
        found = []
        for path in self.root.glob('*.json'):
            if not ID.fullmatch(path.stem):
                continue
            try:
                found.append(self._load(path.stem))
            except (OSError, ValueError):
                log.warning('Skipping unreadable flowchart record %s', path.name)
        found.sort(key=lambda a: a.created_at, reverse=True)
        fields = set(FlowchartSummary.model_fields)
        return [FlowchartSummary(**a.model_dump(include=fields)) for a in found]

    def get(self, ident):
        """Full analysis with its image inlined (image requests cannot carry the workspace header)."""
        if not ID.fullmatch(ident):
            raise KeyError(ident)
        try:
            analysis = self._load(ident)
        except FileNotFoundError as exc:
            raise KeyError(ident) from exc
        except (OSError, ValueError) as exc:
            raise StoreError('This saved analysis is damaged and cannot be opened.') from exc
        try:
            image = (self.root / f'{ident}.img').read_bytes()
            analysis.image_data_url = f'data:{analysis.image_media_type or "image/png"};base64,' + base64.b64encode(image).decode('ascii')
        except OSError:
            analysis.image_data_url = None
        return analysis

    def delete(self, ident):
        if not ID.fullmatch(ident):
            raise KeyError(ident)
        with _lock:
            record = self.root / f'{ident}.json'
            if not record.exists():
                raise KeyError(ident)
            (self.root / f'{ident}.img').unlink(missing_ok=True)
            record.unlink()
