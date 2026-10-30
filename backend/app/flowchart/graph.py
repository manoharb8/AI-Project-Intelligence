"""Deterministic structural checks on the extracted flowchart.

These findings are computed by code, not by the model, so they are repeatable.
They are only as good as the extraction, so they are capped when the image is
hard to read and are always labelled "verify against the diagram" in the UI.
"""
from app.flowchart.schemas import PRIORITY_ORDER

MAX_LISTED = 6
CAP_BY_LEGIBILITY = {'poor': 'Medium'}


def _name(node):
    label = node.label if len(node.label) <= 40 else node.label[:37] + '…'
    return f'{node.id} “{label}”'


def _listing(nodes):
    shown = ', '.join(_name(n) for n in nodes[:MAX_LISTED])
    return shown + (f' and {len(nodes) - MAX_LISTED} more' if len(nodes) > MAX_LISTED else '')


def _components(ids, out):
    """Strongly connected components (Tarjan). Flowcharts are small, so recursion depth is safe."""
    index, low, stack, on, result, counter = {}, {}, [], set(), [], [0]

    def visit(v):
        index[v] = low[v] = counter[0]
        counter[0] += 1
        stack.append(v)
        on.add(v)
        for w in out[v]:
            if w not in index:
                visit(w)
                low[v] = min(low[v], low[w])
            elif w in on:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            group = []
            while True:
                w = stack.pop()
                on.discard(w)
                group.append(w)
                if w == v:
                    break
            result.append(group)

    for v in ids:
        if v not in index:
            visit(v)
    return result


def structural_risks(nodes, edges, legibility='good'):
    if len(nodes) < 2:
        return []
    by_id = {n.id: n for n in nodes}
    out = {i: [] for i in by_id}
    inc = {i: [] for i in by_id}
    for e in edges:
        out[e.source].append(e)
        inc[e.target].append(e)
    isolated = [n for n in nodes if not out[n.id] and not inc[n.id]]
    iso_ids = {n.id for n in isolated}
    live = [n for n in nodes if n.id not in iso_ids]
    findings = []

    def add(title, description, category, priority, members, reason, mitigation):
        findings.append(dict(title=title, description=description, category=category, priority=priority,
                             basis='observed', origin='structural_check', evidence_nodes=[n.id for n in members[:MAX_LISTED]],
                             evidence_edges=[], priority_reason=reason, mitigation=mitigation, assumption=None,
                             priority_note=None))

    one_way = [n for n in live if n.type == 'decision' and len(out[n.id]) < 2]
    if one_way:
        add('Decision without an alternative path',
            f'{_listing(one_way)} {"has" if len(one_way) == 1 else "have"} fewer than two outgoing paths.',
            'logic_gap', 'High', one_way,
            'A decision should lead to at least two outcomes. Here one result of the check has no defined next step, which can stall or break the main path.',
            'Add the missing outcome (for example the “No” or error path) and route it to a handling step or to an end node.')

    unlabeled = [n for n in live if n.type == 'decision' and len(out[n.id]) >= 2 and any(not e.label.strip() for e in out[n.id])]
    if unlabeled:
        add('Decision branches are not labelled',
            f'Outgoing arrows of {_listing(unlabeled)} have no condition text.', 'ambiguity', 'Low', unlabeled,
            'Readers cannot tell which condition leads to which path; this does not stop the process but invites misreading.',
            'Label every branch of the decision (for example Yes / No, or the condition itself).')

    has_end = any(n.type == 'end' for n in nodes)
    sinks = [n for n in live if not out[n.id] and n.type not in ('end', 'connector') and n.type != 'decision']
    if has_end and sinks:
        add('Step ends without reaching an end node',
            f'No arrow leaves {_listing(sinks)}, and {"it is" if len(sinks) == 1 else "they are"} not marked as an end.',
            'dead_end', 'Medium', sinks,
            'The diagram does not say what happens after these steps, so the flow can stop in an undefined state.',
            'Connect each step to its next step, or mark it explicitly as an end or terminator.')
    elif not has_end:
        add('No end point is marked',
            'No node is drawn as an end or terminator' + (f'; the flow stops at {_listing(sinks)}.' if sinks else '.'),
            'ambiguity', 'Low', sinks or live[-1:],
            'Without a marked end, completion and failure outcomes are not explicit. This is a clarity issue rather than a confirmed failure.',
            'Add an End node (or one per outcome, such as Success and Failed) at the final step of each path.')

    starts = [n for n in live if n.type == 'start']
    if not starts:
        entries = [n for n in live if not inc[n.id]]
        add('No start point is marked',
            'No node is drawn as a start' + (f'; the flow begins at {_listing(entries)}.' if entries else ', and no step is free of incoming arrows.'),
            'ambiguity', 'Low', entries or live[:1],
            'Without a marked start, the entry condition of the process is not explicit. This is a clarity issue.',
            'Add a Start node connected to the first step and say what triggers it.')
    else:
        seen, queue = {n.id for n in starts}, [n.id for n in starts]
        while queue:
            for e in out[queue.pop()]:
                if e.target not in seen:
                    seen.add(e.target)
                    queue.append(e.target)
        unreachable = [n for n in live if n.id not in seen]
        if unreachable:
            add('Steps cannot be reached from the start',
                f'No path of arrows leads from the start to {_listing(unreachable)}.', 'logic_gap', 'Medium', unreachable,
                'These steps can never run as drawn, which usually means a missing or misdrawn arrow.',
                'Connect the steps into the main flow, or remove them if they are obsolete.')

    trapped = []
    for group in _components([n.id for n in live], {k: [e.target for e in v] for k, v in out.items()}):
        members = set(group)
        loops = len(group) > 1 or any(e.target == group[0] for e in out[group[0]])
        exits = any(e.target not in members for g in group for e in out[g])
        if loops and not exits and not any(by_id[g].type == 'end' for g in group):
            trapped.extend(by_id[g] for g in group)
    if trapped:
        add('Loop with no exit',
            f'Every arrow leaving {_listing(trapped)} leads back into the same group of steps.', 'logic_gap', 'High', trapped,
            'As drawn the flow can repeat forever and never reach an end, so the process cannot complete.',
            'Add an exit from the loop (success, retry limit, timeout or cancel) that leads to an end node.')

    if isolated:
        add('Disconnected element', f'{_listing(isolated)} {"is" if len(isolated) == 1 else "are"} not connected to any other step.',
            'ambiguity', 'Low', isolated,
            'It may be a legend or note, or an arrow may be missing; as drawn it takes no part in the flow.',
            'Connect it to the flow, or label it clearly as a note or legend.')

    cap = CAP_BY_LEGIBILITY.get(legibility)
    for f in findings:
        if cap and PRIORITY_ORDER[f['priority']] < PRIORITY_ORDER[cap]:
            f['priority_note'] = (f'Capped at {cap} (originally {f["priority"]}) because the image is hard to read, '
                                  'so the extracted arrows may be incomplete.')
            f['priority'] = cap
    return findings
