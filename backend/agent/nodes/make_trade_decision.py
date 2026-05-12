import asyncio
import json
import logging

from langchain_openai import ChatOpenAI
from langsmith import traceable

import config
from agent.state import AgentState

logger = logging.getLogger(__name__)

_llm = ChatOpenAI(
    model=config.OPENROUTER_MODEL,
    api_key=config.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    temperature=0,
    timeout=30,
    default_headers={
        "HTTP-Referer": "https://github.com/Sachit6602/agentfunding.ai",
        "X-Title": "TradeFlow",
    },
)

DECISION_PROMPT = """\
You are an autonomous trading agent making a position decision. This is paper trading — be willing to act.

Signal: {direction} (confidence: {confidence})
Signal reasoning: {reasoning}
Current price: {price}
Instrument: {instrument}
Portfolio cash: ${cash}
Open positions: {positions}

Rules:
- If direction=long and confidence >= 0.55: action=buy, size_usd = min(500, cash * 0.10)
- If direction=short and confidence >= 0.55: action=sell, size_usd = min(500, cash * 0.10)
- If direction=neutral OR confidence < 0.55: action=hold, size_usd=0
- Never exceed 10% of portfolio cash per trade

Output a JSON decision with exactly these four fields:
- action: "buy", "sell", or "hold"
- instrument: the instrument symbol
- size_usd: float, position size in USD (0 if hold)
- reasoning: one sentence explanation

Respond with valid JSON only. No markdown, no extra text."""


def _parse_json(content: str) -> dict:
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)


_HOLD_DECISION = {"action": "hold", "instrument": "XAUUSD", "size_usd": 0, "reasoning": "LLM parse error — defaulting to hold"}


@traceable(name="make_trade_decision")
async def _call_llm(prompt: str) -> dict:
    try:
        response = await asyncio.wait_for(_llm.ainvoke(prompt), timeout=30)
        return _parse_json(response.content)
    except asyncio.TimeoutError:
        logger.error("make_trade_decision LLM call timed out after 30s")
        return _HOLD_DECISION
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"make_trade_decision JSON parse error: {e}")
        return _HOLD_DECISION
    except Exception as e:
        logger.error(f"make_trade_decision LLM error: {e}")
        return _HOLD_DECISION


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
