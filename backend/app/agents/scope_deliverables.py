"""Scope and Deliverable Extraction Agent."""
from app.agents.base import GroundedAgent
class ScopeDeliverablesAgent(GroundedAgent):
    kind='scope'
    retrieval_queries=('Goal objective','project deliverables','milestones timeline deadline target dates','owner responsibilities assigned API frontend testing')
