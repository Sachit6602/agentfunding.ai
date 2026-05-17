import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

# Kite
KITE_RPC_URL: str = os.getenv("KITE_RPC_URL", "https://rpc-testnet.gokite.ai/")
KITE_AGENT_PRIVATE_KEY: str = os.environ["KITE_AGENT_PRIVATE_KEY"]
KITE_ATTESTATION_CONTRACT: str = os.getenv("KITE_ATTESTATION_CONTRACT", "")
KITE_CHAIN_ID: int = int(os.getenv("KITE_CHAIN_ID", "2368"))

# Twelve Data
TWELVE_DATA_API_KEY: str = os.environ["TWELVE_DATA_API_KEY"]

# OpenRouter
OPENROUTER_API_KEY: str = os.environ["OPENROUTER_API_KEY"]
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "anthropic/claude-haiku-4-5")

# LangSmith
LANGSMITH_API_KEY: str = os.getenv("LANGSMITH_API_KEY", "")
LANGSMITH_PROJECT: str = os.getenv("LANGSMITH_PROJECT", "tradeflow")

os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
os.environ.setdefault("LANGCHAIN_API_KEY", LANGSMITH_API_KEY)
os.environ.setdefault("LANGCHAIN_PROJECT", LANGSMITH_PROJECT)
os.environ.setdefault("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")

# Supabase
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY: str = os.environ["SUPABASE_ANON_KEY"]

# x402 Data Server
X402_DATA_SERVER_URL: str = os.getenv("X402_DATA_SERVER_URL", "http://localhost:8001")

# Payment token — set to an ERC-20 contract address to pay with a token (e.g. USDT).
# Leave blank to fall back to native ETH micro-payments.
KITE_PAYMENT_TOKEN_CONTRACT: str = os.getenv("KITE_PAYMENT_TOKEN_CONTRACT", "")
# Token decimals (6 for USDT/USDC, 18 for most others)
KITE_PAYMENT_TOKEN_DECIMALS: int = int(os.getenv("KITE_PAYMENT_TOKEN_DECIMALS", "6"))

# Agent
AGENT_CYCLE_INTERVAL_SECONDS: int = int(os.getenv("AGENT_CYCLE_INTERVAL_SECONDS", "30"))
MAX_POSITION_SIZE_USD: float = float(os.getenv("MAX_POSITION_SIZE_USD", "1000"))
MAX_DRAWDOWN_PCT: float = float(os.getenv("MAX_DRAWDOWN_PCT", "0.05"))
DAILY_LOSS_LIMIT_USD: float = float(os.getenv("DAILY_LOSS_LIMIT_USD", "500"))

# Validate critical values at import time so misconfiguration fails loudly
assert AGENT_CYCLE_INTERVAL_SECONDS >= 5, "AGENT_CYCLE_INTERVAL_SECONDS must be >= 5"
assert MAX_POSITION_SIZE_USD > 0, "MAX_POSITION_SIZE_USD must be positive"
assert 0 < MAX_DRAWDOWN_PCT < 1, "MAX_DRAWDOWN_PCT must be between 0 and 1"
assert DAILY_LOSS_LIMIT_USD > 0, "DAILY_LOSS_LIMIT_USD must be positive"
