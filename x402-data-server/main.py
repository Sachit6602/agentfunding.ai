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

_w3 = Web3(Web3.HTTPProvider(KITE_RPC_URL))

_SYMBOL_MAP = {
    "XAUUSD": "XAU/USD",
    "EURUSD": "EUR/USD",
    "GBPUSD": "GBP/USD",
}


def _verify_payment(tx_hash: str, expected_to: str) -> bool:
    """Confirm that tx_hash is a confirmed transaction to expected_to on Kite testnet."""
    try:
        receipt = _w3.eth.get_transaction_receipt(tx_hash)
        if receipt is None or receipt["status"] != 1:
            return False
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
