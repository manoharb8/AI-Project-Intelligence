"""Independent score examples and unknown/conflicting evidence boundaries."""
import pytest
from app.intelligence.evidence import analyze, BROAD_FOCUS
from app.services.project_health import score_project, explicit_zero, NO_BLOCKERS, NO_RISK
from app.llm.provider import ExtractiveProvider
from test_m3_documentation import EvidenceKB

SCOPE = ['Goal: build a portal. Deliverables: ticket API. Milestone: release is due 30 September 2026. Timeline: release is due 30 September 2026. Priya owns the API.']


def assess(texts):
    kb = EvidenceKB(texts)
    results = analyze(kb, ExtractiveProvider(), BROAD_FOCUS)
    return score_project(results, kb.evidence, kb.evidence, BROAD_FOCUS, 'Test extraction')


def test_weighted_health_hand_calculated_example():
    result = assess([*SCOPE, 'Schedule risk: API development is delayed. Severity: high.', 'Unresolved issue: staging server unavailable.'])
    assert [d.score for d in result.dimensions] == [100, 30, 80]
    assert result.overall_score == 85  # 40 + 24.5 + 20 = 84.5, rounded half up.
    assert result.dimensions[1].higher_is_better is False
    assert result.dimensions[1].health_contribution == 70


def test_explicit_zero_blockers_and_schedule_risks():
    result = assess([*SCOPE, 'No current schedule risks.', 'No current blockers.'])
    assert result.overall_score == 100
    assert result.dimensions[2].count == 0 and result.dimensions[1].score == 0
    assert result.dimensions[2].references[0].quote == 'No current blockers.'


@pytest.mark.parametrize('count,expected', [(1,80), (2,60), (3,40), (4,20), (5,0), (7,0)])
def test_multiple_blockers_reduce_health_with_floor(count, expected):
    blockers = ' '.join(f'Unresolved issue: service {i} is unavailable.' for i in range(count))
    result = assess([*SCOPE, 'No schedule risks.', blockers])
    assert result.dimensions[2].count == count
    assert result.dimensions[2].score == expected


def test_partial_scope_and_missing_timeline_are_visible():
    result = assess(['Goal: build a portal.', 'No blockers.'])
    assert result.dimensions[0].score == 20
    assert result.dimensions[1].score is None
    assert result.overall_score is None
    assert result.assessed_dimensions == 2


def test_no_blocker_evidence_is_not_zero_blockers():
    result = assess([*SCOPE, 'No schedule risks.'])
    assert result.dimensions[2].count is None
    assert result.dimensions[2].score is None
    assert result.overall_score is None


@pytest.mark.parametrize('text', ['No blockers were reported.', 'No blockers were assessed.', 'It is unclear whether there are no blockers.', 'If there are no blockers, continue.', 'No schedule risks were documented.'])
def test_no_review_or_conditional_zero_does_not_mean_healthy(text):
    kb = EvidenceKB([text])
    assert not explicit_zero(kb.evidence, NO_BLOCKERS)
    assert not explicit_zero(kb.evidence, NO_RISK)


def test_conflicting_zero_and_positive_evidence_prevent_score():
    result = assess([*SCOPE, 'No schedule risks.', 'No blockers.', 'Unresolved issue: staging is unavailable.'])
    blocker = result.dimensions[2]
    assert blocker.state == 'conflicting_evidence' and blocker.score is None
    assert len(blocker.references) == 2
    assert result.overall_score is None


def test_resolved_blocker_does_not_count_as_open():
    result = assess(['Unresolved issue: staging was unavailable. Status: Closed.'])
    assert result.dimensions[2].count is None


def test_empty_health_has_no_numeric_score():
    result = assess([])
    assert result.status == 'insufficient_information'
    assert result.overall_score is None
    assert all(d.score is None for d in result.dimensions)


def test_scoring_is_stable_across_repeated_calls_and_input_order():
    texts = [*SCOPE, 'Schedule risk: API is delayed.', 'Unresolved issue: staging is unavailable.']
    first, second = assess(texts), assess(list(reversed(texts)))
    assert first.overall_score == second.overall_score
    assert [(d.id,d.score,d.count) for d in first.dimensions] == [(d.id,d.score,d.count) for d in second.dimensions]
