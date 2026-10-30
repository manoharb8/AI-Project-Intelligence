"""Single-process, persistent workspace registry. Never moves or clears legacy data."""
import hashlib
import json
import logging
import os
import re
import shutil
import stat
import sys
import threading
import time
import uuid
from contextlib import nullcontext
from datetime import datetime, timezone
from pathlib import Path
from pydantic import TypeAdapter
from app.services.knowledge_base import KnowledgeBaseService
from app.workspaces.schemas import WorkspaceRecord, WorkspaceList, WorkspaceState, WorkspaceSnapshot, WorkspaceView, SavedResult

log = logging.getLogger(__name__)
WORKSPACE_ID = re.compile(r'^[a-f0-9]{32}$')


def _make_writable(function, path, _error):
    os.chmod(path, stat.S_IWRITE)
    function(path)


def remove_tree(path, attempts=5):
    """Delete a folder, retrying briefly for transient Windows file locks. True once it is gone."""
    path = Path(path)
    options = {'onexc': _make_writable} if sys.version_info >= (3, 12) else {'onerror': _make_writable}
    for attempt in range(attempts):
        try:
            if path.exists():
                shutil.rmtree(path, **options)
            return True
        except OSError:
            time.sleep(0.2 * (attempt + 1))
    return not path.exists()


def now():
    return datetime.now(timezone.utc).isoformat()


def result_key(kind, query, history=()):
    return json.dumps([kind, query.strip(), [[m.role, m.content] for m in history]], ensure_ascii=False, separators=(',', ':'))


def atomic_json(path, value):
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


class WorkspaceManager:
    def __init__(self, legacy):
        self.root = Path(legacy.data_dir)
        self.lock = threading.RLock()
        self.registry_path = self.root / 'workspaces.json'
        self.services = {'legacy': legacy}
        self.states = {}
        self.tokens = {}
        if self.registry_path.exists():
            registry = WorkspaceList.model_validate_json(self.registry_path.read_text(encoding='utf-8'))
            self.records = registry.workspaces
            if len({w.id for w in self.records}) != len(self.records) or sum(w.id == 'legacy' for w in self.records) != 1:
                raise ValueError('Invalid workspace registry. Existing data has been preserved.')
        else:
            self.records = [WorkspaceRecord(id='legacy', name='Current project', created_at=now(), is_legacy=True)]
            self._save_registry()
        self.pending_path = self.root / 'workspaces-deleted.json'
        self._sweep_deleted()

    def _save_registry(self):
        atomic_json(self.registry_path, WorkspaceList(workspaces=self.records).model_dump(mode='json'))

    def list(self):
        with self.lock:
            return WorkspaceList(workspaces=[w.model_copy() for w in self.records])

    def require(self, ident):
        if not any(w.id == ident for w in self.records):
            raise KeyError('Workspace not found. Select an existing project.')
        return ident

    def directory(self, ident):
        self.require(ident)
        return self.root if ident == 'legacy' else self.root / 'workspaces' / ident

    def kb(self, ident):
        with self.lock:
            self.require(ident)
            if ident not in self.services:
                self.services[ident] = KnowledgeBaseService(self.directory(ident), self.services['legacy'].embeddings)
            return self.services[ident]

    def project_type(self, ident):
        with self.lock:
            self.require(ident)
            return next(w.project_type for w in self.records if w.id == ident)

    def create(self, name, project_type='code'):
        with self.lock:
            if any(w.name.casefold() == name.casefold() for w in self.records):
                raise FileExistsError('A workspace with that name already exists. Choose another name.')
            record = WorkspaceRecord(id=uuid.uuid4().hex, name=name, created_at=now(), project_type=project_type)
            path = self.root / 'workspaces' / record.id
            # Initialise an empty store before making the workspace selectable.
            service = KnowledgeBaseService(path, self.services['legacy'].embeddings)
            self.records.append(record)
            try:
                self._save_registry()
            except Exception:
                self.records.pop()
                raise
            self.services[record.id] = service
            return record

    def rename(self, ident, name):
        """Change only the display name. The id, folder and every stored result are untouched."""
        with self.lock:
            self.require(ident)
            if any(w.id != ident and w.name.casefold() == name.casefold() for w in self.records):
                raise FileExistsError('A workspace with that name already exists. Choose another name.')
            previous = self.records
            self.records = [w.model_copy(update={'name': name}) if w.id == ident else w for w in previous]
            try:
                self._save_registry()
            except Exception:
                self.records = previous
                raise
            return next(w.model_copy() for w in self.records if w.id == ident)

    def delete(self, ident):
        """Remove a workspace and everything it owns. Returns True if folder cleanup is still pending.

        The registry is updated first, so a failure part-way can leave an orphan folder
        (cleaned up on the next start) but never a registry entry that points at nothing.
        The original project is the data root itself and cannot be deleted.
        """
        with self.lock:
            self.require(ident)
            if ident == 'legacy':
                raise PermissionError('The original project cannot be deleted. You can rename it instead.')
            if not WORKSPACE_ID.fullmatch(ident):
                raise KeyError('Workspace not found. Select an existing project.')
            directory = self.root / 'workspaces' / ident
            service = self.services.get(ident)
            # Let an in-flight upload finish so nothing writes into a folder being removed.
            with (service.ingestion_lock if service is not None else nullcontext()):
                previous = self.records
                self.records = [w for w in previous if w.id != ident]
                try:
                    self._save_registry()
                except Exception:
                    self.records = previous
                    raise
                self._mark_pending(ident, True)
                self.services.pop(ident, None)
                self.states.pop(ident, None)
                for key in [k for k in self.tokens if k[0] == ident]:
                    del self.tokens[key]
                if service is not None:
                    self._close_kb(service)
        done = remove_tree(directory)
        if done:
            self._mark_pending(ident, False)
        else:
            log.warning('Workspace folder %s is still in use; it will be removed on the next start.', ident)
        return not done

    @staticmethod
    def _close_kb(service):
        """Release the Chroma files first; Windows cannot delete an open SQLite database."""
        client = getattr(service, 'client', None)
        if client is None:
            return
        try:
            close = getattr(client, 'close', None)
            if callable(close):
                close()
            else:  # chromadb 1.0.x has no close()
                client._system.stop()
                from chromadb.api.shared_system_client import SharedSystemClient
                SharedSystemClient._identifier_to_system.pop(client._identifier, None)
        except Exception:
            log.warning('The vector store of a deleted workspace could not be released cleanly.', exc_info=True)

    def _pending_ids(self):
        try:
            value = json.loads(self.pending_path.read_text(encoding='utf-8')) if self.pending_path.exists() else []
        except (OSError, ValueError):
            return []
        return [i for i in value if isinstance(i, str) and WORKSPACE_ID.fullmatch(i)]

    def _mark_pending(self, ident, pending):
        with self.lock:
            ids = [i for i in self._pending_ids() if i != ident]
            if pending:
                ids.append(ident)
            if ids or self.pending_path.exists():
                atomic_json(self.pending_path, ids)

    def _sweep_deleted(self):
        """Finish removals interrupted by a file lock. Only ids explicitly marked for deletion are touched."""
        live = {w.id for w in self.records}
        for ident in self._pending_ids():
            if ident in live or remove_tree(self.root / 'workspaces' / ident, attempts=2):
                self._mark_pending(ident, False)

    def source_version(self, ident):
        docs = self.kb(ident).list_documents()
        return self._fingerprint({d['id']: d['chunk_count'] for d in docs if d['indexed']})

    @staticmethod
    def _fingerprint(indexed):
        return hashlib.sha256(json.dumps(sorted(indexed.items())).encode()).hexdigest()

    def _state(self, ident):
        self.require(ident)
        if ident not in self.states:
            path = self.directory(ident) / 'workspace-state.json'
            self.states[ident] = WorkspaceState.model_validate_json(path.read_text(encoding='utf-8')) if path.exists() else WorkspaceState()
        return self.states[ident]

    def _save_state(self, ident, value):
        atomic_json(self.directory(ident) / 'workspace-state.json', value.model_dump(mode='json'))
        self.states[ident] = value

    def snapshot(self, ident):
        with self.lock:
            state = self._state(ident)
            # One manifest snapshot: an upload may finish between separate reads.
            indexed = {d['id']: d['chunk_count'] for d in self.kb(ident).list_documents() if d['indexed']}
            return WorkspaceSnapshot(workspace_id=ident, source_version=self._fingerprint(indexed),
                indexed_sources=indexed, **state.model_dump())

    def save_view(self, ident, view):
        with self.lock:
            state = self._state(ident).model_copy(deep=True)
            state.view = WorkspaceView.model_validate(view)
            self._save_state(ident, state)
            return state.view

    def begin(self, ident, key):
        with self.lock:
            self.require(ident)
            token = uuid.uuid4().hex
            self.tokens[(ident, key)] = token
            return token, self.source_version(ident)

    def finish(self, ident, key, token):
        with self.lock:
            if self.tokens.get((ident, key)) == token:
                self.tokens.pop((ident, key), None)

    def complete(self, ident, kind, query, result, token, version, history=()):
        key = result_key(kind, query, history)
        with self.lock:
            if self.tokens.get((ident, key)) != token or self.source_version(ident) != version:
                return
            if any(d['status'] == 'processing' for d in self.kb(ident).list_documents()):
                return
            payload = result.model_dump(mode='json') if hasattr(result, 'model_dump') else result
            fields = dict(kind=kind, key=key, query=query.strip(), source_version=version, saved_at=now(), result=payload)
            if kind == 'assistant':
                fields['history'] = list(history)
            entry = TypeAdapter(SavedResult).validate_python(fields)
            state = self._state(ident).model_copy(deep=True)
            state.results = [r for r in state.results if r.key != key] + [entry]
            self._save_state(ident, state)
            self.tokens.pop((ident, key), None)
