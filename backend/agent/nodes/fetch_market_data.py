import asyncio
import logging
from datetime import datetime, timezone

import httpx
from web3 import Web3
from eth_account import Account

import config
import price_store
import tx_lock as _tx_module
from agent.state import AgentState

logger = logging.getLogger(__name__)

# 0.01 token units (e.g. 0.01 USDT). Stored as a human-readable float; converted
# to the token's integer denomination inside _pay_x402_sync.
PAYMENT_AMOUNT = 0.01

_ERC20_TRANSFER_ABI = [
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


def _pay_x402_sync(payment_details: dict) -> str:
    """Submit payment on Kite testnet and return the tx hash (blocking).

    Uses ERC-20 transfer when KITE_PAYMENT_TOKEN_CONTRACT is configured,
    otherwise falls back to a native-ETH micro-payment.
    """
    w3 = Web3(Web3.HTTPProvider(config.KITE_RPC_URL))
    account = Account.from_key(config.KITE_AGENT_PRIVATE_KEY)
    recipient = Web3.to_checksum_address(payment_details["wallet"])
    nonce = w3.eth.get_transaction_count(account.address)
    base = {"gas": 21_000, "gasPrice": w3.eth.gas_price, "nonce": nonce, "chainId": config.KITE_CHAIN_ID}

    if config.KITE_PAYMENT_TOKEN_CONTRACT:
        token = w3.eth.contract(
            address=Web3.to_checksum_address(config.KITE_PAYMENT_TOKEN_CONTRACT),
            abi=_ERC20_TRANSFER_ABI,
        )
        decimals = config.KITE_PAYMENT_TOKEN_DECIMALS
        amount = int(PAYMENT_AMOUNT * (10 ** decimals))
        tx = token.functions.transfer(recipient, amount).build_transaction(
            {**base, "gas": 80_000, "value": 0}
        )
        logger.info(f"ERC-20 payment: {PAYMENT_AMOUNT} token units → {recipient}")
    else:
        # Native ETH fallback — used when no token contract is configured
        tx = {**base, "to": recipient, "value": w3.to_wei(0.0001, "ether")}
        logger.info(f"Native ETH payment: 0.0001 ETH → {recipient}")

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    if receipt["status"] != 1:
        raise RuntimeError(f"Payment tx reverted: {tx_hash.hex()}")
    return tx_hash.hex()


async def _pay_x402(payment_details: dict) -> str:
    async with _tx_module.tx_lock:
        return await asyncio.to_thread(_pay_x402_sync, payment_details)


async def fetch_market_data_node(state: AgentState) -> AgentState:
    instrument = "XAUUSD"
    timestamp = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{config.X402_DATA_SERVER_URL}/price/{instrument}")

        if resp.status_code == 402:
            payment_details = resp.json()
            token_label = "token units" if config.KITE_PAYMENT_TOKEN_CONTRACT else "ETH (native)"
            logger.info(
                f"402 received — paying {PAYMENT_AMOUNT} {token_label} "
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
