import logging

import config
from agent.state import AgentState

logger = logging.getLogger(__name__)

_DEFAULT_PORTFOLIO = {"cash": 10000.0, "pnl": 0.0, "daily_loss": 0.0}


def _load_constraints() -> dict:
    """Read risk constraints. Reads from env config; swap for on-chain call once
    the attestation contract exposes a getRiskConstraints() view function."""
    # TODO: contract.functions.getRiskConstraints().call()
    return {
        "max_position_size_usd": config.MAX_POSITION_SIZE_USD,
        "max_drawdown_pct": config.MAX_DRAWDOWN_PCT,
        "daily_loss_limit_usd": config.DAILY_LOSS_LIMIT_USD,
    }


def risk_check_node(state: AgentState) -> AgentState:
    decision = state["trade_decision"]
    portfolio = state.get("portfolio") or _DEFAULT_PORTFOLIO
    constraints = _load_constraints()

    action = decision.get("action", "hold")
    size_usd = float(decision.get("size_usd", 0))

    if action == "hold":
        state["risk_result"] = "hold"
        state["risk_reason"] = "Hold — no position change."
        return state

    # Rule 1: position size cap
    if size_usd > constraints["max_position_size_usd"]:
        state["risk_result"] = "veto"
        state["risk_reason"] = (
            f"Position size ${size_usd} exceeds max ${constraints['max_position_size_usd']}"
        )
        logger.warning(f"VETO: {state['risk_reason']}")
        return state

    # Rule 2: daily loss limit
    daily_loss = float(portfolio.get("daily_loss", 0.0))
    if daily_loss >= constraints["daily_loss_limit_usd"]:
        state["risk_result"] = "veto"
        state["risk_reason"] = (
            f"Daily loss ${daily_loss:.2f} at or above limit "
            f"${constraints['daily_loss_limit_usd']}"
        )
        logger.warning(f"VETO: {state['risk_reason']}")
        return state

    # Rule 3: max drawdown
    pnl = float(portfolio.get("pnl", 0.0))
    starting_capital = 10_000.0
    drawdown_pct = abs(min(0.0, pnl)) / starting_capital
    if drawdown_pct >= constraints["max_drawdown_pct"]:
        state["risk_result"] = "veto"
        state["risk_reason"] = (
            f"Drawdown {drawdown_pct:.1%} at or above max "
            f"{constraints['max_drawdown_pct']:.1%}"
        )
        logger.warning(f"VETO: {state['risk_reason']}")
        return state

    state["risk_result"] = "pass"
    state["risk_reason"] = "All risk checks passed."
    logger.info("Risk check PASSED")
    return state
