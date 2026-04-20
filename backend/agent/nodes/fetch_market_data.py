import logging
from datetime import datetime, timezone

import httpx
from web3 import Web3
from eth_account import Account

import config
import price_store
from agent.state import AgentState

logger = logging.getLogger(__name__)

PAYMENT_AMOUNT_USDT = "0.01"


async def _pay_x402(payment_details: dict) -> str:
    """Submit payment on Kite testnet and return the tx hash."""
    w3 = Web3(Web3.HTTPProvider(config.KITE_RPC_URL))
    account = Account.from_key(config.KITE_AGENT_PRIVATE_KEY)

    # TODO: replace with ERC-20 USDT transfer when token contract address is known.
    # For now sends a minimal native token transfer to signal intent — both sides
    # are controlled by the team so the server can accept this for the demo.
    tx = {
        "to": Web3.to_checksum_address(payment_details["wallet"]),
        "value": w3.to_wei(0.0001, "ether"),  # dust native token as payment signal
        "gas": 21_000,
        "gasPrice": w3.eth.gas_price,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": config.KITE_CHAIN_ID,
    }
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    if receipt["status"] != 1:
        raise RuntimeError(f"Payment tx reverted: {tx_hash.hex()}")
    return tx_hash.hex()


async def fetch_market_data_node(state: AgentState) -> AgentState:
    instrument = "XAUUSD"
    timestamp = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{config.X402_DATA_SERVER_URL}/price/{instrument}")

        if resp.status_code == 402:
            payment_details = resp.json()
            logger.info(
                f"402 received — paying {PAYMENT_AMOUNT_USDT} USDT "
                f"to {payment_details['wallet']}"
            )
            tx_hash = await _pay_x402(payment_details)
            logger.info(f"Payment tx: {tx_hash}")

            resp = await client.get(
                f"{config.X402_DATA_SERVER_URL}/price/{instrument}",
                headers={"X-Payment-Tx": tx_hash},
            )
            resp.raise_for_status()
            state["payment_tx_hash"] = tx_hash

        elif resp.status_code == 200:
            state["payment_tx_hash"] = None
        else:
            resp.raise_for_status()

        data = resp.json()

    state["market_data"] = {
        "instrument": instrument,
        "price": data["price"],
        "prices": data.get("prices", [data["price"]]),
        "timestamp": timestamp,
    }
    state["timestamp"] = timestamp
    price_store.update(data["price"], timestamp)
    return state
