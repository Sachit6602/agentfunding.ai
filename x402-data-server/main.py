import os
import logging

import httpx
from fastapi import FastAPI, Header
from fastapi.responses import JSONResponse
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="TradeFlow x402 Data Server")

KITE_RPC_URL: str = os.getenv("KITE_RPC_URL", "https://rpc-testnet.kite.ai")
SERVER_WALLET: str = os.environ["X402_DATA_SERVER_WALLET"]
TWELVE_DATA_API_KEY: str = os.environ["TWELVE_DATA_API_KEY"]
PAYMENT_AMOUNT_USDT: float = 0.01
KITE_CHAIN_ID: int = int(os.getenv("KITE_CHAIN_ID", "2368"))
# Optional: set to an ERC-20 contract address to accept token payments instead of native ETH.
PAYMENT_TOKEN_CONTRACT: str = os.getenv("KITE_PAYMENT_TOKEN_CONTRACT", "")

_w3 = Web3(Web3.HTTPProvider(KITE_RPC_URL))

_SYMBOL_MAP = {
    "XAUUSD": "XAU/USD",
    "EURUSD": "EUR/USD",
    "GBPUSD": "GBP/USD",
}

# keccak256("Transfer(address,address,uint256)")
_ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"


def _verify_erc20_payment(receipt: dict, token_contract: str, expected_to: str) -> bool:
    """Check receipt logs for an ERC-20 Transfer to expected_to from the token contract."""
    token_addr = token_contract.lower()
    recipient_topic = "0x" + expected_to.lower().replace("0x", "").zfill(64)
    for log in receipt.get("logs", []):
        if log["address"].lower() != token_addr:
            continue
        topics = log.get("topics", [])
        if len(topics) < 3:
            continue
        if topics[0].hex() != _ERC20_TRANSFER_TOPIC:
            continue
        # topics[2] is the `to` address (zero-padded to 32 bytes)
        if topics[2].hex() == recipient_topic:
            return True
    return False


def _verify_payment(tx_hash: str, expected_to: str) -> bool:
    """Verify payment tx — ERC-20 Transfer event if token contract is set, native ETH otherwise."""
    try:
        receipt = _w3.eth.get_transaction_receipt(tx_hash)
        if receipt is None or receipt["status"] != 1:
            return False

        if PAYMENT_TOKEN_CONTRACT:
            return _verify_erc20_payment(receipt, PAYMENT_TOKEN_CONTRACT, expected_to)

        # Native ETH: tx.to must equal the server wallet
        tx = _w3.eth.get_transaction(tx_hash)
        return tx["to"].lower() == expected_to.lower()
    except Exception as e:
        logger.error(f"Payment verification error: {e}")
        return False


@app.get("/price/{instrument}")
async def get_price(
    instrument: str,
    x_payment_tx: str | None = Header(default=None),
):
    instrument = instrument.upper()

    if not x_payment_tx:
        return JSONResponse(
            status_code=402,
            content={
                "wallet": SERVER_WALLET,
                "amount": str(PAYMENT_AMOUNT_USDT),
                "token": "USDT",
                "chain_id": KITE_CHAIN_ID,
                "message": (
                    f"Pay {PAYMENT_AMOUNT_USDT} USDT to {SERVER_WALLET} "
                    "on Kite testnet, then retry with X-Payment-Tx header."
                ),
            },
        )

    if not _verify_payment(x_payment_tx, SERVER_WALLET):
        return JSONResponse(status_code=402, content={"error": "Payment verification failed"})

    td_symbol = _SYMBOL_MAP.get(instrument, instrument[:3] + "/" + instrument[3:])

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://api.twelvedata.com/time_series",
            params={
                "symbol": td_symbol,
                "interval": "1min",
                "outputsize": 30,
                "apikey": TWELVE_DATA_API_KEY,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    values = data.get("values", [])
    prices = [float(v["close"]) for v in reversed(values)]
    current_price = prices[-1] if prices else 0.0

    logger.info(f"Served {instrument} @ {current_price} (payment: {x_payment_tx[:12]}...)")

    return {
        "instrument": instrument,
        "price": current_price,
        "prices": prices,
        "payment_verified": True,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
