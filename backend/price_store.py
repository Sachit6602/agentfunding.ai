"""
In-memory store for live price history and current price.
Updated by fetch_market_data node; read by /chart and /prices endpoints.
"""
from collections import deque

_price_history = deque(maxlen=100)  # {price, timestamp}
_last_price: float | None = None


def update(price: float, timestamp: str) -> None:
    global _last_price
    _last_price = price
    _price_history.append({"price": price, "timestamp": timestamp})


def get_history() -> list:
    return list(_price_history)


def get_last_price() -> float | None:
    return _last_price
