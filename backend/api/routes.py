from fastapi import APIRouter

from supabase import create_client
import config

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


@router.get("/portfolio")
def get_portfolio() -> dict:
    result = (
        _supabase.table("portfolio")
        .select("*")
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return {"cash": 10000.0, "pnl": 0.0, "daily_loss": 0.0, "positions": []}
