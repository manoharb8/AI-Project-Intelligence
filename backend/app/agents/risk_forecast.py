"""Risk Detection and Delivery Forecasting Agent."""
from app.agents.base import GroundedAgent
class RiskForecastAgent(GroundedAgent):
    kind='risk'
    retrieval_queries=('schedule risk delay behind plan','dependency gap missing approval contract','delivery challenges forecast milestone threatened cannot start')
