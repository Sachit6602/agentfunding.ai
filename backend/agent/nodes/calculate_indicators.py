import logging

import pandas as pd

from agent.state import AgentState

logger = logging.getLogger(__name__)


def _ema(prices: list, period: int) -> float:
    return float(pd.Series(prices).ewm(span=period, adjust=False).mean().iloc[-1])


def _rsi(prices: list, period: int = 14) -> float:
    s = pd.Series(prices)
    delta = s.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = float(
        gain.ewm(com=period - 1, min_periods=period).mean().iloc[-1]
    )
    avg_loss = float(
        loss.ewm(com=period - 1, min_periods=period).mean().iloc[-1]
    )
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def calculate_indicators_node(state: AgentState) -> AgentState:
    prices: list = state["market_data"]["prices"]

    if len(prices) < 21:
        padding = [prices[-1]] * (21 - len(prices))
        prices = padding + prices

    ema_9 = _ema(prices, 9)
    ema_21 = _ema(prices, 21)
    rsi = _rsi(prices, 14)
    current_price = prices[-1]
    momentum = round((current_price - prices[0]) / prices[0] * 100, 4)

    state["indicators"] = {
        "rsi": rsi,
        "ema_9": round(ema_9, 4),
        "ema_21": round(ema_21, 4),
        "ema_crossover": "bullish" if ema_9 > ema_21 else "bearish",
        "momentum_pct": momentum,
        "price": current_price,
    }
    logger.info(f"Indicators: {state['indicators']}")
    return state
