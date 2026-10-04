"""Blocker and Action Item Identification Agent."""
from app.agents.base import GroundedAgent
class BlockersActionsAgent(GroundedAgent):
    kind='blockers'
    retrieval_queries=('meeting notes pending decisions unresolved issues','sprint progress update blockers missing unavailable','action item assigned owner due date pending task')
