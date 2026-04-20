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
    instrument = decision["instrument"]
    positions = portfolio.get("positions", [])
    cash = float(portfolio.get("cash", 10000.0))
    pnl = float(portfolio.get("pnl", 0.0))
    daily_loss = float(portfolio.get("daily_loss", 0.0))

    if action == "buy":
        # Close matching short first
        for i, pos in enumerate(positions):
            if pos["instrument"] == instrument and pos.get("side") == "short":
                # P&L on short: entry - current (profit when price falls)
                price_diff = pos["entry_price"] - entry_price
                units = pos["size_usd"] / pos["entry_price"]
                realised = units * price_diff
                pnl += realised
                daily_loss += min(0, realised)
                cash += pos["size_usd"] + realised  # return collateral ± profit
                positions.pop(i)
                break
        else:
            # No short to close — open a long
            cash -= size_usd
            positions.append({"instrument": instrument, "side": "long", "size_usd": size_usd, "entry_price": entry_price})

    elif action == "sell":
        # Close matching long first
        for i, pos in enumerate(positions):
            if pos["instrument"] == instrument and pos.get("side", "long") == "long":
                price_diff = entry_price - pos["entry_price"]
                units = pos["size_usd"] / pos["entry_price"]
                realised = units * price_diff
                pnl += realised
                daily_loss += min(0, realised)
                cash += pos["size_usd"] + realised
                positions.pop(i)
                break
        else:
            # No long to close — open a short
            cash -= size_usd  # lock collateral
            positions.append({"instrument": instrument, "side": "short", "size_usd": size_usd, "entry_price": entry_price})

    portfolio["cash"] = round(cash, 4)
    portfolio["pnl"] = round(pnl, 4)
    portfolio["daily_loss"] = round(daily_loss, 4)
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
