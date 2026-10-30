"""Validation, risk policy and structural graph checks."""
import pytest
from app.flowchart.graph import structural_risks
from app.flowchart.provider import VisionOutputError
from app.flowchart.schemas import FlowEdge, FlowNode
from app.flowchart.service import NotAFlowchart, normalize, _merge_risks, _summary
from flowchart_support import ORDER_FLOW


def nodes(*spec):
    return [FlowNode(id=f'N{i}', label=l, type=t) for i, (l, t) in enumerate(spec, 1)]


def edges(*pairs):
    return [FlowEdge(source=f'N{a}', target=f'N{b}', label=l) for a, b, l in pairs]


def titles(findings):
    return {f['title'] for f in findings}


def test_structural_checks_find_the_planted_flaws_in_the_sample():
    parsed = normalize(ORDER_FLOW)
    found = {f['title']: f for f in structural_risks(parsed['nodes'], parsed['edges'])}
    assert found['Decision without an alternative path']['evidence_nodes'] == ['N3']
    assert found['Decision without an alternative path']['priority'] == 'High'
    assert found['Loop with no exit']['evidence_nodes'] == ['N6']
    assert all(f['basis'] == 'observed' and f['origin'] == 'structural_check' for f in found.values())
    assert 'Step ends without reaching an end node' not in found


def test_clean_flowchart_has_no_structural_findings():
    n = nodes(('Start', 'start'), ('Check?', 'decision'), ('Do it', 'process'), ('Reject', 'process'), ('End', 'end'))
    e = edges((1, 2, ''), (2, 3, 'Yes'), (2, 4, 'No'), (3, 5, ''), (4, 5, ''))
    assert structural_risks(n, e) == []


def test_dead_end_unreachable_unlabelled_and_missing_markers():
    n = nodes(('Start', 'start'), ('Q?', 'decision'), ('A', 'process'), ('B', 'process'), ('End', 'end'), ('Orphan step', 'process'), ('Lost', 'process'))
    e = edges((1, 2, ''), (2, 3, ''), (2, 4, ''), (3, 5, ''), (6, 7, ''))
    t = titles(structural_risks(n, e))
    assert {'Decision branches are not labelled', 'Step ends without reaching an end node', 'Steps cannot be reached from the start'} <= t
    no_markers = titles(structural_risks(nodes(('A', 'process'), ('B', 'process')), edges((1, 2, ''))))
    assert {'No end point is marked', 'No start point is marked'} <= no_markers


def test_poor_legibility_caps_structural_priority():
    parsed = normalize(ORDER_FLOW)
    found = structural_risks(parsed['nodes'], parsed['edges'], 'poor')
    assert {f['priority'] for f in found} == {'Medium'}
    assert all('Capped at Medium' in f['priority_note'] for f in found if f['title'] == 'Loop with no exit')


def test_inferred_risk_can_never_outrank_observed_and_is_capped():
    parsed = normalize(ORDER_FLOW)
    stock = next(r for r in parsed['risks'] if r['title'] == 'No stock check')
    assert stock['basis'] == 'inferred' and stock['priority'] == 'Medium' and 'Capped at Medium' in stock['priority_note']
    assert stock['assumption']


def test_observed_claim_without_real_references_is_downgraded_to_inferred():
    raw = {**ORDER_FLOW, 'risks': [dict(title='Ghost', description='d', category='failure_point', priority='Critical',
                                       basis='observed', evidence_nodes=['N99'], priority_reason='r', mitigation='m')]}
    risk = normalize(raw)['risks'][0]
    assert risk['basis'] == 'inferred' and risk['priority'] == 'Medium' and risk['evidence_nodes'] == []
    assert 'Treated as inferred' in risk['priority_note'] and risk['assumption']


def test_dangling_edges_duplicate_ids_and_bad_values_are_cleaned_with_warnings():
    raw = {**ORDER_FLOW, 'nodes': ORDER_FLOW['nodes'] + [dict(id='N1', label='dup', type='nonsense')],
           'edges': ORDER_FLOW['edges'] + [{'from': 'N2', 'to': 'N42'}],
           'risks': [dict(title='x', description='d', priority='urgent', basis='observed', evidence_nodes=['N3'])]}
    parsed = normalize(raw)
    assert len(parsed['nodes']) == 8 and len(parsed['edges']) == 8
    assert any('Duplicate node id N1' in w for w in parsed['warnings']) and any('arrow(s)' in w for w in parsed['warnings'])
    assert parsed['risks'][0]['priority'] == 'Medium' and 'no valid priority' in parsed['risks'][0]['priority_note']


def test_not_a_flowchart_and_malformed_payloads():
    with pytest.raises(NotAFlowchart, match='meeting notes'):
        normalize({'is_flowchart': False, 'not_flowchart_reason': 'This is a page of meeting notes.'})
    for bad in ('text', {'nodes': 'x'}, {'edges': {}, 'nodes': []}):
        with pytest.raises(VisionOutputError):
            normalize(bad)


def test_merge_orders_by_priority_then_observed_and_avoids_duplicates():
    parsed = normalize(ORDER_FLOW)
    merged = _merge_risks(parsed['risks'], structural_risks(parsed['nodes'], parsed['edges']))
    order = ['Critical', 'High', 'Medium', 'Low']
    assert [order.index(r.priority) for r in merged] == sorted(order.index(r.priority) for r in merged)
    # the model already reported the N3 logic gap, so the structural duplicate is not added again
    assert sum('N3' in r.evidence_nodes and r.category == 'logic_gap' for r in merged) == 1
    assert [r.id for r in merged] == [f'R{i}' for i in range(1, len(merged) + 1)]
    s = _summary(merged)
    assert s.critical == 1 and s.observed + s.inferred == len(merged)
