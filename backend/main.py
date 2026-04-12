import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from agent.graph import graph as agent_graph
from api.routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

agent_task: asyncio.Task | None = None


async def agent_loop() -> None:
    cycle = 0
    while True:
        try:
            logger.info(f"Starting agent cycle {cycle}")
            initial_state = {
                "market_data": None,
                "indicators": None,
                "signal": None,
                "trade_decision": None,
                "risk_result": None,
                "risk_reason": None,
                "trade_id": None,
                "entry_price": None,
                "payment_tx_hash": None,
                "attestation_tx_hash": None,
                "portfolio": None,
                "cycle_count": cycle,
                "timestamp": None,
                "errors": [],
            }
            result = await agent_graph.ainvoke(initial_state)
            logger.info(
                f"Cycle {cycle} complete. Attestation: {result.get('attestation_tx_hash')}"
            )
            cycle += 1
        except Exception as e:
            logger.error(f"Cycle {cycle} error: {e}", exc_info=True)
        await asyncio.sleep(config.AGENT_CYCLE_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent_task
    agent_task = asyncio.create_task(agent_loop())
    yield
    if agent_task:
        agent_task.cancel()


app = FastAPI(title="TradeFlow", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
