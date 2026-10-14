"""Single-process, persistent workspace registry. Never moves or clears legacy data."""
import hashlib
import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from pydantic import TypeAdapter
from app.services.knowledge_base import KnowledgeBaseService
from app.workspaces.schemas import WorkspaceRecord, WorkspaceList, WorkspaceState, WorkspaceSnapshot, WorkspaceView, SavedResult


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

    def create(self, name):
        with self.lock:
            if any(w.name.casefold() == name.casefold() for w in self.records):
                raise FileExistsError('A workspace with that name already exists. Choose another name.')
            record = WorkspaceRecord(id=uuid.uuid4().hex, name=name, created_at=now())
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
