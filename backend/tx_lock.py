import asyncio

# Single lock serializing all on-chain transactions so nonces never collide
# across concurrent agent nodes (fetch_market_data payment + kite attestation).
tx_lock = asyncio.Lock()
