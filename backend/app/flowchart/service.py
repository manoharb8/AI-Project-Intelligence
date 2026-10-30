"""Orchestrates: prepare image -> ask the vision model -> validate -> add structural checks -> save."""
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from app.flowchart import settings
from app.flowchart.graph import structural_risks
from app.flowchart.imaging import ImageProblem, detect_kind, prepare_image, prepare_pil, render_pdf
from app.flowchart.provider import VisionOutputError
from app.flowchart.schemas import (PRIORITY_ORDER, FlowchartAnalysis, FlowchartUploadResult, FlowEdge, FlowNode,
                                   Risk, RiskSummary, SkippedPage)
from app.flowchart.store import FlowchartStore, StoreError, new_id
from app.llm.base import ProviderError

log = logging.getLogger(__name__)

MAX_NODES, MAX_EDGES, MAX_RISKS = 150, 300, 15
NODE_TYPES = ('start', 'end', 'process', 'decision', 'input_output', 'subprocess', 'connector', 'other')
CATEGORIES = ('failure_point', 'missing_step', 'bottleneck', 'logic_gap', 'dead_end', 'ambiguity', 'other')
PRIORITIES = {'critical': 'Critical', 'high': 'High', 'medium': 'Medium', 'moderate': 'Medium', 'low': 'Low'}
ACCEPTED = 'Upload a PNG, JPEG or WebP image, or a PDF.'


class FlowchartError(Exception):
    """Carries an HTTP status and a message that is safe to show to the user."""

    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class NotAFlowchart(Exception):
    pass


def _text(value, limit, default=''):
    return (value.strip()[:limit] if isinstance(value, str) else '') or default


def _enum(value, allowed, default):
    value = value.strip().lower().replace(' ', '_').replace('-', '_') if isinstance(value, str) else ''
    return value if value in allowed else default


def _strings(value, limit, count):
    return [s for s in (_text(v, limit) for v in value[:count]) if s] if isinstance(value, list) else []


def normalize(raw):
    """Turn the model's answer into clean, internally consistent parts, or raise VisionOutputError."""
    if not isinstance(raw, dict):
        raise VisionOutputError('The answer must be one JSON object.')
    nodes_raw = raw.get('nodes')
    if raw.get('is_flowchart') is False:
        raise NotAFlowchart(_text(raw.get('not_flowchart_reason'), 300, 'The image does not look like a flowchart or process diagram.'))
    if not isinstance(nodes_raw, list) or not isinstance(raw.get('edges', []), list):
        raise VisionOutputError('"nodes" and "edges" must be lists. Return every visible node and arrow.')
    warnings = []
    nodes, ids = [], set()
    for item in nodes_raw[:MAX_NODES]:
        if not isinstance(item, dict):
            continue
        ident = _text(item.get('id'), 40)
        if not ident:
            continue
        if ident in ids:
            warnings.append(f'Duplicate node id {ident} was ignored.')
            continue
        ids.add(ident)
        nodes.append(FlowNode(id=ident, label=_text(item.get('label'), 300, '(no text)'),
                              type=_enum(item.get('type'), NODE_TYPES, 'process'), legible=item.get('legible') is not False))
    if len(nodes_raw) > MAX_NODES:
        warnings.append(f'Only the first {MAX_NODES} nodes were kept; the diagram is larger than this tool analyses.')
    edges, seen, dropped = [], set(), 0
    for item in (raw.get('edges') or [])[:MAX_EDGES]:
        if not isinstance(item, dict):
            continue
        source, target = _text(item.get('from', item.get('source')), 40), _text(item.get('to', item.get('target')), 40)
        if source not in ids or target not in ids:
            dropped += 1
            continue
        label = _text(item.get('label'), 80)
        if (source, target, label) not in seen:
            seen.add((source, target, label))
            edges.append(FlowEdge(source=source, target=target, label=label))
    if dropped:
        warnings.append(f'{dropped} arrow(s) pointing to steps that are not in the transcription were ignored.')
    pairs = {(e.source, e.target) for e in edges}
    risks = []
    for item in (raw.get('risks') or [])[:MAX_RISKS] if isinstance(raw.get('risks', []), list) else []:
        if not isinstance(item, dict):
            continue
        title = _text(item.get('title'), 140)
        description = _text(item.get('description'), 900)
        if not (title or description):
            continue
        priority = PRIORITIES.get(_text(item.get('priority'), 20).lower())
        notes = []
        if priority is None:
            priority = 'Medium'
            notes.append('The model gave no valid priority, so Medium was used.')
        basis = 'observed' if _text(item.get('basis'), 20).lower() == 'observed' else 'inferred'
        refs = [n for n in _strings(item.get('evidence_nodes'), 40, 20) if n in ids]
        edge_refs = []
        for ref in item.get('evidence_edges') or []:
            if isinstance(ref, dict):
                pair = (_text(ref.get('from', ref.get('source')), 40), _text(ref.get('to', ref.get('target')), 40))
                if pair in pairs:
                    edge_refs.append(FlowEdge(source=pair[0], target=pair[1]))
        assumption = _text(item.get('assumption'), 500) or None
        if basis == 'observed' and not (refs or edge_refs):
            basis = 'inferred'
            notes.append('Treated as inferred: it cites no step or arrow that exists in the transcription.')
        if basis == 'inferred':
            assumption = assumption or 'The model did not state its assumption; treat this as a suggestion to confirm.'
            if priority in ('Critical', 'High'):
                notes.append(f'Capped at Medium (the model proposed {priority}): the diagram does not show this risk, so it cannot outrank risks the diagram does show.')
                priority = 'Medium'
        risks.append(dict(title=title or description[:80], description=description or title,
                          category=_enum(item.get('category'), CATEGORIES, 'other'), priority=priority, basis=basis,
                          origin='vision_model', evidence_nodes=refs, evidence_edges=edge_refs,
                          priority_reason=_text(item.get('priority_reason'), 500, f'Rated {priority} by the model.'),
                          mitigation=_text(item.get('mitigation'), 700, 'No specific mitigation was suggested.'),
                          assumption=assumption, priority_note=' '.join(notes) or None))
    return dict(title=_text(raw.get('title'), 160) or None, purpose=_text(raw.get('purpose'), 600, 'Not stated.'),
                legibility=_enum(raw.get('legibility'), ('good', 'partial', 'poor'), 'good'),
                image_issues=_strings(raw.get('image_issues'), 200, 6), nodes=nodes, edges=edges, risks=risks,
                uncertainties=_strings(raw.get('uncertainties'), 300, 15), warnings=warnings)


def _merge_risks(model_risks, structural):
    covered = [(set(r['evidence_nodes']), r['category']) for r in model_risks]
    extra = [s for s in structural if not any(set(s['evidence_nodes']) & nodes and s['category'] == cat for nodes, cat in covered)]
    ordered = sorted(model_risks + extra, key=lambda r: (PRIORITY_ORDER[r['priority']], r['basis'] != 'observed'))
    return [Risk(id=f'R{i}', **r) for i, r in enumerate(ordered, 1)]


def _summary(risks):
    counts = RiskSummary()
    for r in risks:
        setattr(counts, r.priority.lower(), getattr(counts, r.priority.lower()) + 1)
        setattr(counts, r.basis, getattr(counts, r.basis) + 1)
    return counts


class FlowchartService:
    def __init__(self, provider):
        self.provider = provider

    # -- one image -> one validated analysis -------------------------------------------------
    def _ask(self, image, project_type, page, total):
        feedback = None
        for attempt in (1, 2):
            try:
                return normalize(self.provider.analyze(image, project_type, page, total, feedback))
            except VisionOutputError as exc:
                if attempt == 2:
                    raise FlowchartError(502, 'The model did not return a usable analysis, even after a retry. Try again, '
                                              'use a clearer image, or choose a stronger vision model.') from exc
                feedback = str(exc)
            except ProviderError as exc:
                raise FlowchartError(503, str(exc)) from exc

    def _analysis(self, image, project_type, filename, kind, page=None, total=None):
        started = time.monotonic()
        parsed = self._ask(image, project_type, page, total)
        if not parsed['nodes']:
            issues = ' '.join(parsed['image_issues'])
            raise FlowchartError(422, 'No flowchart steps could be read from this image.' + (f' {issues}' if issues else '')
                                 + ' Upload a sharper, larger export of the diagram.')
        structural = structural_risks(parsed['nodes'], parsed['edges'], parsed['legibility'])
        risks = _merge_risks(parsed['risks'], structural)
        warnings = list(parsed['warnings'])
        if parsed['legibility'] != 'good':
            warnings.append('The image is hard to read. Treat this as a draft and check the extracted steps and arrows against the diagram.')
        if any(not n.legible for n in parsed['nodes']):
            warnings.append('Some steps are marked unreadable; findings involving them are less reliable.')
        status = self.provider.status
        log.info('Flowchart analysed: %s nodes, %s edges, %s risks in %.1fs', len(parsed['nodes']), len(parsed['edges']),
                 len(risks), time.monotonic() - started)
        return FlowchartAnalysis(
            id=new_id(), filename=filename, source_type=kind, page=page, page_count=total,
            created_at=datetime.now(timezone.utc).isoformat(), title=parsed['title'], node_count=len(parsed['nodes']),
            risk_summary=_summary(risks), provider=status.name, model=status.model or '', project_type=project_type,
            purpose=parsed['purpose'], legibility=parsed['legibility'], image_issues=parsed['image_issues'],
            nodes=parsed['nodes'], edges=parsed['edges'], risks=risks, uncertainties=parsed['uncertainties'],
            warnings=warnings, processing_notes=list(image.notes), image_media_type=image.media_type)

    def _save(self, store, analysis, image):
        try:
            store.save(analysis, image.data)
        except StoreError as exc:
            raise FlowchartError(409, str(exc)) from exc
        return analysis.model_copy(update={'image_data_url': image.data_url})

    # -- entry point -------------------------------------------------------------------------
    def analyze_upload(self, store: FlowchartStore, project_type, filename, data):
        status = self.provider.status
        if not status.ready:
            raise FlowchartError(503, status.message)
        if not data:
            raise FlowchartError(422, 'The file is empty.')
        kind = detect_kind(data)
        if kind is None:
            raise FlowchartError(422, f'This file is not a supported image or PDF. {ACCEPTED}')
        name = Path(filename.replace('\\', '/')).name[:200] or 'flowchart'
        if kind == 'pdf':
            return self._analyze_pdf(store, project_type, name, data)
        try:
            image = prepare_image(data)
        except ImageProblem as exc:
            raise FlowchartError(422, str(exc)) from exc
        try:
            analysis = self._analysis(image, project_type, name, kind)
        except NotAFlowchart as exc:
            raise FlowchartError(422, f'No flowchart was found in this image. {exc}') from exc
        return FlowchartUploadResult(analyses=[self._save(store, analysis, image)], notes=list(image.notes))

    def _analyze_pdf(self, store, project_type, name, data):
        try:
            pages, total = render_pdf(data)
        except ImageProblem as exc:
            raise FlowchartError(422, str(exc)) from exc

        def work(number, picture):
            try:
                image = prepare_pil(picture)
            except ImageProblem as exc:
                return number, None, None, str(exc), None
            try:
                return number, self._analysis(image, project_type, name, 'pdf', number, total), image, None, None
            except NotAFlowchart as exc:
                return number, None, None, f'No flowchart on this page. {exc}', None
            except FlowchartError as exc:
                return number, None, None, exc.message, exc

        with ThreadPoolExecutor(max_workers=min(3, len(pages))) as pool:
            outcomes = list(pool.map(lambda item: work(item[0], item[1]), enumerate(pages, 1)))
        analyses = [self._save(store, a, image) for _, a, image, _, _ in outcomes if a is not None]
        skipped = [SkippedPage(page=n, reason=reason) for n, a, _, reason, _ in outcomes if a is None]
        notes = []
        if total > len(pages):
            notes.append(f'Only the first {len(pages)} of {total} pages were analysed (VISION_PDF_MAX_PAGES).')
        if not analyses:
            failure = next((e for *_, e in outcomes if e is not None), None)
            if failure is not None:
                raise failure
            raise FlowchartError(422, 'No flowchart was found in the analysed pages of this PDF. ' + ' '.join(s.reason for s in skipped[:3]))
        return FlowchartUploadResult(analyses=analyses, skipped=skipped, notes=notes)
