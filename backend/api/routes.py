from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from supabase import create_client
import config
import price_store

router = APIRouter()

_supabase = None


def _get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    return _supabase


@router.get("/trades")
def get_trades(limit: int = 20) -> list:
    result = (
        _get_supabase().table("trades")
        .select("*")
        .order("timestamp", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


@router.get("/agent/status")
def get_agent_status() -> dict:
    result = (
        _get_supabase().table("trades")
        .select("*")
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )
    latest = result.data[0] if result.data else {}
    return {"latest_trade": latest, "status": "running"}


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


@router.get("/portfolio")
def get_portfolio() -> dict:
    return _get_portfolio()


@router.get("/chart")
def get_chart() -> list:
    """Return in-memory price history for the chart."""
    return price_store.get_history()


@router.post("/positions/close/{instrument}")
def close_position(instrument: str) -> dict:
    """Manually close an open position at current market price."""
    current_price = price_store.get_last_price()
    if current_price is None:
        raise HTTPException(status_code=503, detail="No price data available yet")

    portfolio = _get_portfolio()
    positions = portfolio.get("positions", [])
    closed = None

    for i, pos in enumerate(positions):
        if pos["instrument"].upper() == instrument.upper():
            entry_price = float(pos["entry_price"])
            size_usd = float(pos["size_usd"])
            side = pos.get("side", "long")
            units = size_usd / entry_price

            if side == "long":
                realised = units * (current_price - entry_price)
            else:
                realised = units * (entry_price - current_price)

            portfolio["pnl"] = round(float(portfolio.get("pnl", 0.0)) + realised, 4)
            portfolio["daily_loss"] = round(float(portfolio.get("daily_loss", 0.0)) + min(0, realised), 4)
            portfolio["cash"] = round(float(portfolio.get("cash", 10000.0)) + size_usd + realised, 4)
            closed = {**pos, "exit_price": current_price, "realised_pnl": round(realised, 4)}
            positions.pop(i)
            break

    if closed is None:
        raise HTTPException(status_code=404, detail=f"No open position for {instrument}")

    portfolio["positions"] = positions
    _get_supabase().table("portfolio").upsert({
        **portfolio,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    return {"closed": closed, "portfolio": portfolio}
