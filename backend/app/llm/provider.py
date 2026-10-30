"""Local, evidence-grounded provider for ordinary project intelligence.

External vision requests are isolated in ``app.flowchart.provider``. The
normal document agents, Documentation Studio, Project Health, Project
Assistant, and Overview must never require or call a cloud LLM.
"""
import os

from app.llm.base import ProviderError, ProviderStatus
from app.agents.schemas import CATEGORIES
from app.agents.extraction import classify, statements


class ExtractiveProvider:
    status = ProviderStatus(
        'Local extractive analysis',
        'extractive',
        True,
        'Uses local retrieval evidence and conservative extraction rules. No generative LLM or external API is used.',
    )

    def generate(self, kind, query, evidence):
        findings = []
        for item in evidence:
            for quote in statements(item['text']):
                for category in CATEGORIES[kind]:
                    if category in classify(quote):
                        findings.append(dict(category=category, evidence_id=item['id'], quote=quote))
        return {'findings': findings[:60]}


class UnavailableProvider:
    def __init__(self, message):
        self.status = ProviderStatus('Provider unavailable', 'unavailable', False, message)

    def generate(self, *args):
        raise ProviderError(self.status.message)


def build_provider(env=None, transport=None):
    """Always build local extraction for normal project intelligence.

    ``env`` and ``transport`` remain optional for compatibility with existing
    call sites/tests, but they are deliberately not used. Groq is only
    configured and called by the separate Flowchart Analysis provider.
    """
    return ExtractiveProvider()
