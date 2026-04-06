import json
import logging

from langchain_anthropic import ChatAnthropic
from langsmith import traceable

import config
from agent.state import AgentState

logger = logging.getLogger(__name__)

_llm = ChatAnthropic(
    model="claude-haiku-4-5",
    api_key=config.ANTHROPIC_API_KEY,
    temperature=0,
)

DECISION_PROMPT = """\
You are an autonomous trading agent making a position decision.

Signal: {direction} (confidence: {confidence})
Signal reasoning: {reasoning}
Current price: {price}
Instrument: {instrument}
Portfolio cash: ${cash}
Open positions: {positions}

Output a JSON decision with exactly these four fields:
- action: "buy", "sell", or "hold"
- instrument: the instrument symbol
- size_usd: float, position size in USD (0 if hold)
- reasoning: one sentence explanation

Respond with valid JSON only. No markdown, no extra text."""


@traceable(name="make_trade_decision")
async def _call_llm(prompt: str) -> dict:
    response = await _llm.ainvoke(prompt)
    return json.loads(response.content)


async def make_trade_decision_node(state: AgentState) -> AgentState:
    signal = state["signal"]
    md = state["market_data"]
    portfolio = state.get("portfolio") or {"cash": 10000.0, "positions": []}

    prompt = DECISION_PROMPT.format(
        direction=signal["direction"],
        confidence=signal["confidence"],
        reasoning=signal["reasoning"],
        price=md["price"],
        instrument=md["instrument"],
        cash=portfolio.get("cash", 10000.0),
        positions=portfolio.get("positions", []),
    )

    decision = await _call_llm(prompt)
    logger.info(f"Decision: {decision}")
    state["trade_decision"] = decision
    return state
