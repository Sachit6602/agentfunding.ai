# Brainstorming Gist
## TradeFlow — Kite AI Hackathon 2026

---

## Core Framing (Pitch Angle)

"A human trader pays Bloomberg for data, logs decisions in a spreadsheet, and settles trades through a broker. TradeFlow does all three autonomously — pays for data via x402, logs decisions on-chain as attestations, and executes through a paper ledger — with no human in the loop."

The on-chain attestation is an immutable trading journal. Every decision, including vetoed ones, is verifiable forever.

---

## What Makes This Novel

- Agent paying for its own market data via x402 is genuinely new — no existing trading system does this
- On-chain attestations with LLM reasoning attached, not just trade outcomes
- Risk constraints read from a smart contract — programmable governance baked into the agent loop
- Self-hosted x402 data service means the commerce + trading track overlap is explicit and demonstrable

---

## Ideas Beyond MVP (pick if ahead of schedule)

**Portfolio rebalancing node** — agent shifts allocation between EUR/USD and XAU/USD based on relative volatility. Adds another autonomous decision cycle with on-chain proof.

**News sentiment via paid x402 endpoint** — agent fetches a financial headline through a second x402-gated service. Demonstrates multi-service agent commerce, hits the Agentic Commerce track harder.

**Spending limits enforced on-chain** — smart contract refuses attestation if agent has exceeded hourly Test USDT spend. Shows programmable constraints as a safety mechanism, not just a claim.

**Agent reputation score** — simple on-chain counter tracking win/loss ratio across cycles. Connects to Kite's reputation-aware capital delegation framing in the trading track brief.

---

## What to Cut If Behind

- Multi-instrument support — just use XAU/USD. Cleanest signal story, judges don't need breadth.
- Complex strategy logic — RSI alone is sufficient. Alpha doesn't matter, autonomy does.
- WebSocket real-time updates — SSE polling every 5 seconds looks live enough.
- Fancy UI animations — a functional data table with tx hash links beats a slow animated dashboard.

---

## Demo Moment Priorities (ranked)

1. x402 payment in the UI — click a payment hash, open it in Kite explorer live
2. Vetoed trade with on-chain attestation — shows risk governance is real, not just claimed
3. Cycle running without any human input — let it run for 60 seconds during Q&A
4. LangSmith trace — shows the LLM reasoning step to technical judges

---

## Naming & Framing Notes

- **TradeFlow** — clean, maps to FixFlow naming pattern, easy to say
- Avoid "bot" in the pitch — use "agent" consistently
- Don't say "paper trading" to judges — say "simulated execution ledger" or "on-chain paper trail"
- Lead with Kite integration, not the trading strategy — the strategy is the vehicle, Kite is the story

---

## Open Questions to Resolve Week 1

- Does Kite testnet have enough uptime stability for a live demo? → Test aggressively week 1, build fallback if not
- Is Test USDT faucet available and reliable? → Confirm via Kite docs / Discord before building payment flow
- Does Twelve Data free tier allow caching or does ToS prohibit it? → Check before caching strategy is finalised
- How long does a Kite attestation tx take to confirm? → If > 10s, show optimistic UI with pending state
