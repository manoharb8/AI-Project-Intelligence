"""Provider interface consumed by all three agents."""
from dataclasses import dataclass
from typing import Protocol

class ProviderError(Exception):
    """A safe message only; never include keys or provider response bodies."""

@dataclass(frozen=True)
class ProviderStatus:
    name: str
    mode: str
    ready: bool
    message: str

class AnalysisProvider(Protocol):
    @property
    def status(self) -> ProviderStatus: ...
    def generate(self, kind: str, query: str, evidence: list[dict]) -> dict: ...
