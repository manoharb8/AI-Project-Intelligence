"""Lossless report projection of saved workspace results. No AI or scoring calls."""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from app.workspaces.schemas import WorkspaceSnapshot

DEFAULT_FOCUS = 'Review the uploaded project documents.'
LABELS = {'goals':'Project goals', 'milestones':'Milestones', 'timelines':'Timelines',
          'responsibilities':'Responsibilities', 'deliverables':'Deliverables',
          'schedule_risks':'Schedule risks', 'dependency_gaps':'Dependency gaps',
          'delivery_challenges':'Delivery challenges', 'delivery_forecast':'Stated delivery outlook',
          'pending_decisions':'Pending decisions', 'unresolved_issues':'Unresolved issues', 'action_items':'Action items'}

@dataclass
class Block:
    kind: str
    text: str

@dataclass
class Report:
    workspace: str
    exported_at: str
    blocks: list[Block] = field(default_factory=list)
    def add(self, kind, text):
        self.blocks.append(Block(kind, str(text)))
    def value(self, label, value):
        self.add('body', f'{label}: {"Not stated" if value is None or value == "" else value}')


def build_report(name: str, snapshot: WorkspaceSnapshot) -> Report:
    report = Report(name, datetime.now(timezone.utc).isoformat())
    selected = {}
    # Prefer current source results; use the broad default for documentation and
    # health when available. Otherwise label the actual saved focus explicitly.
    for kind in ('scope', 'risk', 'blockers', 'documentation', 'health'):
        candidates = [r for r in snapshot.results if r.kind == kind]
        current = [r for r in candidates if r.source_version == snapshot.source_version]
        candidates = current or candidates
        default = [r for r in candidates if r.query == DEFAULT_FOCUS] if kind in ('documentation','health') else []
        selected[kind] = (default or candidates)[-1] if candidates else None
    evidence = {}
    reference_numbers = {}

    def cite(evidence_id, quote, sources):
        source = next((e for e in sources if e.id == evidence_id), None)
        if source:
            # Preserve alternate saved versions of a passage if present.
            key = (source.id, source.filename, source.location, source.text)
            if key not in reference_numbers:
                reference_numbers[key] = len(reference_numbers) + 1
                evidence[key] = source
            ref = reference_numbers[key]
            report.add('caption', f'[E{ref}] {source.filename} · {source.location} · {source.id}')
        else:
            report.add('caption', f'Source unavailable in saved result · {evidence_id}')
        report.add('quote', quote)

    def references(refs, result):
        for ref in refs:
            cite(ref.evidence_id, ref.quote, result.evidence)

    def metadata(entry):
        if not entry:
            report.add('body', 'Insufficient evidence / Not generated. No saved result is available for this section.')
            return None
        result = entry.result
        stale = entry.source_version != snapshot.source_version
        report.add('caption', f'{"OUT OF DATE — earlier sources" if stale else "Current indexed source version"} | Generated: {result.generated_at}')
        report.value('Review focus', entry.query)
        report.value('Result status', result.status)
        report.value('Analysis mode', result.provider)
        for warning in result.warnings:
            report.add('note', warning)
        if result.evidence_limited:
            report.add('note', 'This result is limited to the retrieved evidence; it is not a complete audit of all documents.')
        return result

    report.add('title', 'Project Intelligence & Risk Advisor')
    report.add('subtitle', 'Project evidence report')
    report.value('Workspace', name)
    report.value('Workspace ID', snapshot.workspace_id)
    report.value('Exported at (UTC)', report.exported_at)
    report.value('Indexed source documents', len(snapshot.indexed_sources))
    report.value('Traceable indexed passages', sum(snapshot.indexed_sources.values()))
    report.add('note', 'This report contains saved results only. No facts, scores or commitments were generated for export. Findings are retrieved entries, not a verified count of unique real-world incidents. Missing information is not an all-clear. Each section identifies its actual focus and generation time.')
    report.add('heading', '1. Project summary')
    scope = selected['scope']
    if scope:
        result = metadata(scope)
        goals = [f for f in result.findings if f.category == 'goals']
        for finding in goals:
            cite(finding.evidence_id, finding.quote, result.evidence)
        if not goals:
            report.add('body', 'Project goal: Not stated in the saved scope findings.')
    else:
        metadata(None)
    for heading, kind in [('2. Scope & deliverables','scope'),('3. Risks & delivery outlook','risk'),('4. Blockers & actions','blockers')]:
        report.add('heading', heading)
        result = metadata(selected[kind])
        if not result:
            continue
        report.add('body', result.message)
        for category in result.coverage:
            report.add('subheading', LABELS.get(category.category, category.category))
            report.add('caption', f'Evidence state: {category.state} | Returned findings: {category.count}')
            for finding in result.findings:
                if finding.category != category.category:
                    continue
                cite(finding.evidence_id, finding.quote, result.evidence)
                report.value('Information state', finding.information_state)
                if finding.category in ('responsibilities','action_items'):
                    report.value('Owner', finding.owner)
                if finding.category == 'action_items':
                    report.value('Due date', finding.due_date)
                    report.value('Status in source', finding.source_status)
                elif finding.dates:
                    report.value('Dates in source', ' · '.join(finding.dates))
                if finding.severity is not None:
                    report.value('Stated severity', finding.severity)
            if not category.count:
                report.add('body', 'Not established in retrieved evidence. No information has been assumed.')
    report.add('heading', '5. Structured documentation')
    docs = metadata(selected['documentation'])
    if docs:
        report.add('subheading', 'User stories')
        if not docs.user_stories:
            report.add('body', 'Insufficient evidence to establish user stories.')
        for item in docs.user_stories:
            report.add('item', f'{item.id} · {item.title}')
            for label,value in [('Role / user',item.role),('Need / action',item.need),('Benefit / value',item.benefit),('Information state',item.information_state)]:
                report.value(label,value)
            report.value('Acceptance criteria', '\n'.join(item.acceptance_criteria) or None)
            references(item.references, docs)
        report.add('subheading', 'Risk register')
        if not docs.risks:
            report.add('body', 'No risk entries established. This does not mean there are no risks.')
        for item in docs.risks:
            report.add('item', f'{item.id} · {item.title}')
            for label,value in [('Description',item.description),('Categories',', '.join(LABELS.get(c,c) for c in item.categories)),('Impact',item.impact),('Likelihood',item.likelihood),('Source status',item.status),('Stated severity',item.severity),('Grounded mitigation',item.mitigation)]:
                report.value(label,value)
            references(item.references, docs)
        report.add('subheading', 'Structured action items')
        if not docs.action_items:
            report.add('body', 'No action entries established. Unrecorded commitments are not inferred.')
        for item in docs.action_items:
            report.add('item', f'{item.id} · {item.title}')
            for label,value in [('Description',item.description),('Owner',item.owner),('Due date',item.due_date),('Source status',item.status),('Dependency',item.dependency)]:
                report.value(label,value)
            references(item.references, docs)
    report.add('heading', '6. Project health & why this score')
    health = metadata(selected['health'])
    if health:
        report.value('Overall health score', f'{health.overall_score} / 100' if health.overall_score is not None else 'Insufficient evidence')
        report.value('Interpretation', health.interpretation)
        report.value('Methodology version', health.methodology_version)
        report.add('body', health.methodology)
        for dimension in health.dimensions:
            report.add('subheading', dimension.label)
            report.value('Score', f'{dimension.score} / 100' if dimension.score is not None else 'Insufficient evidence')
            report.value('Direction', 'Higher = better' if dimension.higher_is_better else 'Higher timeline risk = more risk')
            report.value('State', dimension.state)
            report.value('Weight', dimension.weight)
            report.value('Health contribution', dimension.health_contribution)
            report.value('Returned count', dimension.count)
            report.add('body', dimension.explanation)
            report.add('body', dimension.calculation)
            references(dimension.references, health)
            for signal in dimension.scope_signals:
                report.value(LABELS.get(signal.category,signal.category), f'{signal.state} · {signal.points} points')
                references(signal.references, health)
    report.add('heading', '7. Key project insights')
    # Only existing automatic briefing questions; private follow-up conversation
    # is not silently included in a shareable report.
    for question in ('Are we on track?','What is blocking the project?'):
        report.add('subheading', question)
        entries = [r for r in snapshot.results if r.kind == 'assistant' and not r.history and r.query == question]
        current = [r for r in entries if r.source_version == snapshot.source_version]
        answer = metadata((current or entries)[-1] if entries else None)
        if answer:
            report.value('Grounding', answer.grounding)
            report.add('body', answer.answer)
            for statement in answer.statements:
                report.add('item', LABELS.get(statement.category,statement.category))
                references([statement.reference], answer)
                for label,value in [('Owner',statement.owner),('Due date',statement.due_date),('Source status',statement.source_status),('Stated severity',statement.severity)]:
                    report.value(label,value)
    report.add('heading', '8. Evidence & source references')
    if not evidence:
        report.add('body', 'Insufficient evidence. No source references are available in saved results.')
    for key,source in evidence.items():
        report.add('subheading', f'E{reference_numbers[key]} · {source.filename}')
        report.value('Location', source.location)
        report.value('Evidence ID', source.id)
        report.value('Document ID', source.document_id)
        report.value('Format', source.document_type.upper())
        report.add('quote', source.text)
    return report
