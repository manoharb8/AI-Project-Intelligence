"""Shared helpers: fixture files and a scripted vision provider (it does NOT perceive images)."""
from pathlib import Path
from app.flowchart.provider import VisionStatus
from app.llm.base import ProviderError

FIXTURES = Path(__file__).resolve().parents[2] / 'sample_flowcharts'


def fixture(name):
    return (FIXTURES / name).read_bytes()


def n(i, label, type='process'):
    return dict(id=f'N{i}', label=label, type=type)


# What a correct reading of samples/flowcharts/order_flow.png looks like (checked by eye).
ORDER_FLOW = dict(
    is_flowchart=True, legibility='good', title='Order fulfilment',
    purpose='Receives a customer order, checks payment, reserves stock, creates a shipping label and ships the order.',
    nodes=[n(1, 'Start', 'start'), n(2, 'Receive customer order'), n(3, 'Payment valid?', 'decision'), n(4, 'Reserve stock'),
           n(5, 'Generate shipping label'), n(6, 'Retry upload'), n(7, 'Ship order'), n(8, 'End', 'end')],
    edges=[{'from': 'N1', 'to': 'N2'}, {'from': 'N2', 'to': 'N3'}, {'from': 'N3', 'to': 'N4', 'label': 'Yes'},
           {'from': 'N4', 'to': 'N5'}, {'from': 'N5', 'to': 'N7', 'label': 'Label OK'},
           {'from': 'N5', 'to': 'N6', 'label': 'Upload fails'}, {'from': 'N6', 'to': 'N6'}, {'from': 'N7', 'to': 'N8'}],
    risks=[
        dict(title='No path when payment is invalid', description='The decision “Payment valid?” only has a Yes branch.',
             category='logic_gap', priority='Critical', basis='observed', evidence_nodes=['N3'],
             evidence_edges=[{'from': 'N3', 'to': 'N4'}],
             priority_reason='A failed payment has no defined outcome on the main path.',
             mitigation='Add a No branch that notifies the customer and ends the order.'),
        dict(title='No stock check', description='Stock is reserved without checking availability.', category='missing_step',
             priority='Critical', basis='inferred', evidence_nodes=[], priority_reason='Overselling is possible.',
             mitigation='Add an availability check before reserving.', assumption='Reserve stock does not check availability itself.'),
    ],
    uncertainties=['The arrow on “Retry upload” was read as a self-loop.'])


class ScriptedVision:
    """Returns queued answers; records what it was sent."""

    def __init__(self, *answers, ready=True):
        self.answers = list(answers)
        self.calls = []
        self.status = VisionStatus('Scripted Groq test model', 'groq', ready, 'test' if ready else 'Set GROQ_API_KEY.', 'test-model')

    def analyze(self, image, project_type='code', page=None, total_pages=None, feedback=None):
        self.calls.append(dict(media_type=image.media_type, size=len(image.data), width=image.width, height=image.height,
                               project_type=project_type, page=page, total=total_pages, feedback=feedback, data=image.data))
        answer = self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]
        if isinstance(answer, Exception):
            raise answer
        return answer
