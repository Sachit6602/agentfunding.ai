# Product Requirements Document
## TradeFlow — Autonomous Trading Agent on Kite AI
**Hackathon:** Kite AI Global Hackathon 2026
**Tracks:** Agentic Trading & Portfolio Management + Agentic Commerce
**Timeline:** 4 weeks

---

## 1. Problem Statement

Algorithmic trading requires constant market monitoring, signal interpretation, risk enforcement, and settlement — all tasks today requiring either human oversight or expensive fragmented tooling. There is no production system where an AI agent can autonomously trade, pay for the data it needs, and leave a verifiable on-chain audit trail without human involvement.

Kite's x402 protocol and programmable identity layer make this possible for the first time.

---

## 2. Product Vision

Build a single autonomous trading agent that monitors forex and metals markets, generates trade signals, enforces risk rules, executes paper trades, pays for market data via x402 on Kite testnet, and records every decision as a Kite chain attestation — all with zero human involvement after initial setup.

---

## 3. Target Users

| User | Pain Point | How TradeFlow Helps |
|------|-----------|---------------------|
| Quant developer | Needs auditable, autonomous strategy execution | Full pipeline with on-chain proof |
| DeFi protocol | Wants AI capital allocation without manual oversight | Agent-native payment + risk constraints |
| Hackathon judge | Wants to see real agentic commerce in action | Live x402 payment + Kite attestation in demo |

---

## 4. Core Features

### F1 — Market Data Ingestion
Fetch live forex (EUR/USD, GBP/USD) and metals (XAU/USD) prices via Twelve Data free tier. Compute RSI, EMA crossover, and momentum indicators. Cache results to avoid rate limit hits during demo.

### F2 — Signal Interpretation
Claude Haiku receives indicator values and outputs a structured signal: direction, confidence score, and plain-English reasoning. LangSmith traces every LLM call.

### F3 — Risk Management
Deterministic rule enforcement: max position size, max drawdown percentage, daily loss limit. Reads constraints from a deployed Kite chain smart contract. Vetoes trade if any constraint is violated and logs the veto reason to agent state.

### F4 — Trade Execution
Paper trading ledger persisted in Supabase. Records instrument, direction, size, entry price, timestamp, and agent reasoning. Simulated P&L updated on each cycle. No real money.

### F5 — x402 Payment for Market Data ⭐
Market data endpoint wrapped as an x402-gated service hosted by the team. Agent holds a Kite Agent Passport on testnet. Each data fetch triggers the full x402 flow: 402 response → agent pays with Test USDT → data returned. Self-hosting both sides of the payment ensures demo reliability.

### F6 — Kite Chain Attestation ⭐
Every trade decision — including vetoed ones — written to Kite testnet as an on-chain attestation. Payload includes timestamp, instrument, signal, decision, risk check result, and payment tx hash. Publicly queryable via Kite explorer.

### F7 — Dashboard UI
Real-time feed showing agent state, current positions, P&L, and recent signals. Payment log with Kite tx hashes. Attestation log with explorer links. Agent status indicator showing which node is currently executing.

---

## 5. Architecture

```
[fetch_market_data] ──► [calculate_indicators] ──► [interpret_signal (LLM)]
                                                            │
                                                 [make_trade_decision (LLM)]
                                                            │
                                                    [risk_check (code)]
                                                       /         \
                                              PASS               VETO
                                                │                   │
                                    [execute_paper_trade]      [log_veto]
                                                │                   │
                                        [x402_pay_data_api] ◄───────┘
                                                │
                                    [log_kite_attestation]
                                                │
                                          [update_ui]
                                                │
                                          [loop / sleep]
```

Agent state carries: market data, signal, trade decision, risk result, payment tx hash, attestation tx hash, portfolio snapshot, cycle count.

---

## 6. Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent orchestration | LangGraph |
| LLM | Claude Haiku 4.5 |
| Backend | FastAPI |
| Market data | Twelve Data (free tier) |
| Kite integration | Kite Agent Passport + x402 |
| On-chain | Kite L1 testnet (EVM) — attestation smart contract |
| Database | Supabase |
| Observability | LangSmith |
| Frontend | Next.js + Tailwind |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## 7. Judging Criteria Mapping

| Criterion | How TradeFlow Delivers |
|-----------|----------------------|
| **Agent Autonomy** | Cyclic loop runs indefinitely; risk veto is autonomous; no human approves trades |
| **Developer Experience** | LangSmith traces, clean README, Vercel + Railway deploy, reproducible via env vars |
| **Real-World Applicability** | Forex and metals are real markets; x402 is a production payment standard; on-chain audit is enterprise-relevant |
| **Novel/Creativity** | Agent paying for its own data via x402; on-chain trade attestations with LLM reasoning attached |

---

## 8. Week-by-Week Plan

| Week | Focus |
|------|-------|
| **1** | Kite testnet setup, Agent Passport, x402 round-trip working end-to-end, LangGraph skeleton |
| **2** | Market data node, LLM signal node, risk check node, paper trade ledger |
| **3** | x402 payment integration, attestation contract deployed, Supabase persistence |
| **4** | Frontend dashboard, Vercel + Railway deploy, demo polish, README |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Kite testnet downtime during demo | Cache last known state; show pre-recorded tx hashes as fallback |
| Twelve Data rate limit | Cache market data locally; demo can use static snapshot if needed |
| x402 payment failure | Self-host the data service — full control of both sides of payment |
| Smart contract bugs | Keep contract minimal; test on testnet in week 1 |
