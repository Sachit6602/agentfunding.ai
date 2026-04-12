import logging
import uuid

from supabase import create_client

import config
from agent.state import AgentState

logger = logging.getLogger(__name__)

_supabase = None


def _get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    return _supabase


def _get_portfolio() -> dict:
    result = (
        _get_supabase().table("portfolio")
        .select("*")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return {"cash": 10000.0, "pnl": 0.0, "daily_loss": 0.0, "positions": []}


def _update_portfolio(portfolio: dict, decision: dict, entry_price: float) -> dict:
    action = decision.get("action")
    size_usd = float(decision.get("size_usd", 0))

    if action == "buy":
        portfolio["cash"] = float(portfolio.get("cash", 10000.0)) - size_usd
        portfolio.setdefault("positions", []).append(
            {"instrument": decision["instrument"], "size_usd": size_usd, "entry_price": entry_price}
        )
    elif action == "sell":
        # Close first matching long position and realise P&L
        positions = portfolio.get("positions", [])
        for i, pos in enumerate(positions):
            if pos["instrument"] == decision["instrument"]:
                realised = size_usd - pos["size_usd"]
                portfolio["pnl"] = float(portfolio.get("pnl", 0.0)) + realised
                portfolio["daily_loss"] = float(portfolio.get("daily_loss", 0.0)) + min(0, realised)
                portfolio["cash"] = float(portfolio.get("cash", 10000.0)) + size_usd
                positions.pop(i)
                break
        portfolio["positions"] = positions

    return portfolio


async def execute_paper_trade_node(state: AgentState) -> AgentState:
    decision = state["trade_decision"]
    md = state["market_data"]
    entry_price = float(md["price"])
    trade_id = str(uuid.uuid4())

    portfolio = _get_portfolio()
    portfolio = _update_portfolio(portfolio, decision, entry_price)
    _get_supabase().table("portfolio").upsert({**portfolio, "updated_at": state["timestamp"]}).execute()

    record = {
        "id": trade_id,
        "instrument": decision["instrument"],
        "action": decision["action"],
        "size_usd": decision["size_usd"],
        "entry_price": entry_price,
        "reasoning": decision["reasoning"],
        "signal": state["signal"],
        "cycle": state["cycle_count"],
        "timestamp": state["timestamp"],
        "payment_tx_hash": state.get("payment_tx_hash"),
        "attestation_tx_hash": None,
    }
    _get_supabase().table("trades").insert(record).execute()
    logger.info(f"Paper trade logged: {trade_id} — {decision['action']} {decision['instrument']}")

    state["trade_id"] = trade_id
    state["entry_price"] = entry_price
    state["portfolio"] = portfolio
    return state
