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

SIGNAL_PROMPT = """\
You are a quantitative trading signal interpreter.

Instrument: {instrument}
Current price: {price}
RSI (14): {rsi}
EMA 9: {ema_9}
EMA 21: {ema_21}
EMA crossover: {ema_crossover}
Momentum (%): {momentum_pct}

Output a JSON signal with exactly these three fields:
- direction: "long", "short", or "neutral"
- confidence: float between 0.0 and 1.0
- reasoning: one sentence explanation

Respond with valid JSON only. No markdown, no extra text."""


@traceable(name="interpret_signal")
async def _call_llm(prompt: str) -> dict:
    response = await _llm.ainvoke(prompt)
    return json.loads(response.content)


async def interpret_signal_node(state: AgentState) -> AgentState:
    ind = state["indicators"]
    md = state["market_data"]

    prompt = SIGNAL_PROMPT.format(
        instrument=md["instrument"],
        price=ind["price"],
        rsi=ind["rsi"],
        ema_9=ind["ema_9"],
        ema_21=ind["ema_21"],
        ema_crossover=ind["ema_crossover"],
        momentum_pct=ind["momentum_pct"],
    )

    signal = await _call_llm(prompt)
    logger.info(f"Signal: {signal}")
    state["signal"] = signal
    return state
