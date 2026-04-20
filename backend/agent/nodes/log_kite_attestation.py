import json
import logging
from datetime import datetime, timezone

from web3 import Web3
from eth_account import Account
from supabase import create_client

import config
from agent.state import AgentState

logger = logging.getLogger(__name__)

ATTESTATION_ABI = [
    {
        "inputs": [
            {"name": "tradeId", "type": "bytes32"},
            {"name": "payload", "type": "string"},
        ],
        "name": "attest",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

_w3 = Web3(Web3.HTTPProvider(config.KITE_RPC_URL))
_account = Account.from_key(config.KITE_AGENT_PRIVATE_KEY)
_supabase = None


def _get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    return _supabase


async def log_kite_attestation_node(state: AgentState) -> AgentState:
    if not config.KITE_ATTESTATION_CONTRACT:
        logger.warning("KITE_ATTESTATION_CONTRACT not set — skipping on-chain attestation")
        return state

    contract = _w3.eth.contract(
        address=Web3.to_checksum_address(config.KITE_ATTESTATION_CONTRACT),
        abi=ATTESTATION_ABI,
    )

    raw_id = (state.get("trade_id") or "").replace("-", "")
    trade_id_bytes = bytes.fromhex(raw_id.ljust(64, "0")[:64])

    payload = json.dumps(
        {
            "timestamp": state.get("timestamp") or datetime.now(timezone.utc).isoformat(),
            "instrument": state["market_data"]["instrument"],
            "signal": state.get("signal"),
            "decision": state.get("trade_decision"),
            "risk_result": state.get("risk_result"),
            "risk_reason": state.get("risk_reason"),
            "payment_tx_hash": state.get("payment_tx_hash"),
            "cycle": state["cycle_count"],
        },
        separators=(",", ":"),
    )

    tx = contract.functions.attest(trade_id_bytes, payload).build_transaction(
        {
            "from": _account.address,
            "gas": 300_000,
            "gasPrice": _w3.eth.gas_price,
            "nonce": _w3.eth.get_transaction_count(_account.address),
            "chainId": config.KITE_CHAIN_ID,
        }
    )
    signed = _account.sign_transaction(tx)
    tx_hash = Web3.to_hex(_w3.eth.send_raw_transaction(signed.raw_transaction))

    logger.info(f"Kite attestation tx: {tx_hash}")
    state["attestation_tx_hash"] = tx_hash

    # Persist the hash back to the Supabase trade record
    trade_id = state.get("trade_id")
    if trade_id:
        _get_supabase().table("trades").update(
            {"attestation_tx_hash": tx_hash}
        ).eq("id", trade_id).execute()

    return state
