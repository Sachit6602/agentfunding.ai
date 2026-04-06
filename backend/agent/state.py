from typing import Optional
from typing_extensions import TypedDict


class AgentState(TypedDict):
    market_data: Optional[dict]
    indicators: Optional[dict]
    signal: Optional[dict]
    trade_decision: Optional[dict]
    risk_result: Optional[str]
    risk_reason: Optional[str]
    trade_id: Optional[str]
    entry_price: Optional[float]
    payment_tx_hash: Optional[str]
    attestation_tx_hash: Optional[str]
    portfolio: Optional[dict]
    cycle_count: int
    timestamp: Optional[str]
    errors: list
