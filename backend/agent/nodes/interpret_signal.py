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
    default_headers={
        "HTTP-Referer": "https://github.com/Sachit6602/agentfunding.ai",
        "X-Title": "TradeFlow",
    },
)

SIGNAL_PROMPT = """\
You are a quantitative trading signal interpreter. Be decisive — only output "neutral" if the indicators are genuinely mixed.

Instrument: {instrument}
Current price: {price}
RSI (14): {rsi}  [oversold < 35, overbought > 65]
EMA 9: {ema_9}
EMA 21: {ema_21}
EMA crossover: {ema_crossover}  [bullish_cross = strong long signal, bearish_cross = strong short signal]
Momentum (%): {momentum_pct}  [> +0.3% = bullish, < -0.3% = bearish]

Rules:
- If RSI < 35 and momentum > 0: direction=long, confidence >= 0.65
- If RSI > 65 and momentum < 0: direction=short, confidence >= 0.65
- If EMA crossover is bullish_cross or bearish_cross: confidence >= 0.70
- If signals conflict or are flat: direction=neutral, confidence <= 0.50

Output a JSON signal with exactly these three fields:
- direction: "long", "short", or "neutral"
- confidence: float between 0.0 and 1.0
- reasoning: one sentence explanation

Respond with valid JSON only. No markdown, no extra text."""


def _parse_json(content: str) -> dict:
    """Strip markdown code fences if present, then parse JSON."""
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # drop first line (```json or ```) and last line (```)
        text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)


@traceable(name="interpret_signal")
async def _call_llm(prompt: str) -> dict:
    response = await _llm.ainvoke(prompt)
    return _parse_json(response.content)


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
