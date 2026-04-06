import os
from dotenv import load_dotenv

load_dotenv()

# Kite
KITE_RPC_URL: str = os.getenv("KITE_RPC_URL", "https://rpc-testnet.kite.ai")
KITE_AGENT_PRIVATE_KEY: str = os.environ["KITE_AGENT_PRIVATE_KEY"]
KITE_ATTESTATION_CONTRACT: str = os.getenv("KITE_ATTESTATION_CONTRACT", "")
KITE_CHAIN_ID: int = int(os.getenv("KITE_CHAIN_ID", "2368"))

# Twelve Data
TWELVE_DATA_API_KEY: str = os.environ["TWELVE_DATA_API_KEY"]

# Anthropic
ANTHROPIC_API_KEY: str = os.environ["ANTHROPIC_API_KEY"]

# LangSmith
LANGSMITH_API_KEY: str = os.getenv("LANGSMITH_API_KEY", "")
LANGSMITH_PROJECT: str = os.getenv("LANGSMITH_PROJECT", "tradeflow")

os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
os.environ.setdefault("LANGCHAIN_API_KEY", LANGSMITH_API_KEY)
os.environ.setdefault("LANGCHAIN_PROJECT", LANGSMITH_PROJECT)

# Supabase
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY: str = os.environ["SUPABASE_ANON_KEY"]

# x402 Data Server
X402_DATA_SERVER_URL: str = os.getenv("X402_DATA_SERVER_URL", "http://localhost:8001")

# Agent
AGENT_CYCLE_INTERVAL_SECONDS: int = int(os.getenv("AGENT_CYCLE_INTERVAL_SECONDS", "30"))
MAX_POSITION_SIZE_USD: float = float(os.getenv("MAX_POSITION_SIZE_USD", "1000"))
MAX_DRAWDOWN_PCT: float = float(os.getenv("MAX_DRAWDOWN_PCT", "0.05"))
DAILY_LOSS_LIMIT_USD: float = float(os.getenv("DAILY_LOSS_LIMIT_USD", "500"))
