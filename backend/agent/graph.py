from langgraph.graph import StateGraph, END

from agent.state import AgentState
from agent.nodes.fetch_market_data import fetch_market_data_node
from agent.nodes.calculate_indicators import calculate_indicators_node
from agent.nodes.interpret_signal import interpret_signal_node
from agent.nodes.make_trade_decision import make_trade_decision_node
from agent.nodes.risk_check import risk_check_node
from agent.nodes.execute_paper_trade import execute_paper_trade_node
from agent.nodes.log_kite_attestation import log_kite_attestation_node


def _route_risk(state: AgentState) -> str:
    return state.get("risk_result") or "veto"


def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("fetch_market_data", fetch_market_data_node)
    graph.add_node("calculate_indicators", calculate_indicators_node)
    graph.add_node("interpret_signal", interpret_signal_node)
    graph.add_node("make_trade_decision", make_trade_decision_node)
    graph.add_node("risk_check", risk_check_node)
    graph.add_node("execute_paper_trade", execute_paper_trade_node)
    graph.add_node("log_kite_attestation", log_kite_attestation_node)

    graph.set_entry_point("fetch_market_data")
    graph.add_edge("fetch_market_data", "calculate_indicators")
    graph.add_edge("calculate_indicators", "interpret_signal")
    graph.add_edge("interpret_signal", "make_trade_decision")
    graph.add_edge("make_trade_decision", "risk_check")
    graph.add_conditional_edges(
        "risk_check",
        _route_risk,
        {"pass": "execute_paper_trade", "veto": "log_kite_attestation"},
    )
    graph.add_edge("execute_paper_trade", "log_kite_attestation")
    graph.add_edge("log_kite_attestation", END)

    return graph.compile()


# Module-level instance used by LangGraph CLI / Studio
graph = build_graph()
