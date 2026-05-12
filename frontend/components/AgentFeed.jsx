"use client";

const KITE_EXPLORER = "https://testnet.kitescan.ai/tx";

const PIPELINE_STEPS = [
  { key: "fetch",   label: "Market Data",  icon: "📡" },
  { key: "analyze", label: "Indicators",   icon: "📊" },
  { key: "signal",  label: "LLM Signal",   icon: "🧠" },
  { key: "decide",  label: "Decision",     icon: "⚡" },
  { key: "risk",    label: "Risk Check",   icon: "🛡" },
  { key: "execute", label: "Execute",      icon: "✅" },
  { key: "attest",  label: "Attestation",  icon: "🔗" },
];

function deriveSteps(trade) {
  if (!trade) return {};
  return {
    fetch:   true,
    analyze: true,
    signal:  !!trade.signal,
    decide:  !!trade.action,
    risk:    !!trade.action,
    execute: trade.action !== "hold",
    attest:  !!trade.attestation_tx_hash,
  };
}

function TxChip({ hash }) {
  if (!hash) return <span className="text-gray-700 text-[10px] italic">pending</span>;
  return (
    <a
      href={`${KITE_EXPLORER}/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
    >
      {hash.slice(0, 6)}…{hash.slice(-4)}
      <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-7 text-right">{pct}%</span>
    </div>
  );
}

export default function AgentFeed({ agentStatus, latestTrade, trades, cycleCount }) {
  const steps = deriveSteps(latestTrade);
  const signal = latestTrade?.signal;
  const direction = signal?.direction;
  const dirColor = direction === "long" ? "text-green-400" : direction === "short" ? "text-red-400" : "text-gray-400";

  const recentTrades = (trades || []).slice(0, 6);

  return (
    <aside className="w-72 shrink-0 border-l border-white/5 bg-[#0a0f1e]/50 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Agent Feed</span>
        <div className="flex items-center gap-1.5">
          {agentStatus === "running" && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
            </span>
          )}
          <span className="text-[10px] text-gray-600">
            {cycleCount != null ? `cycle #${cycleCount}` : agentStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-0">

        {/* Pipeline */}
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold mb-3">Last Cycle Pipeline</p>
          <div className="relative flex flex-col gap-0">
            {PIPELINE_STEPS.map((step, i) => {
              const done = steps[step.key];
              const isLast = i === PIPELINE_STEPS.length - 1;
              return (
                <div key={step.key} className="flex items-start gap-2.5">
                  {/* Connector line + dot */}
                  <div className="flex flex-col items-center" style={{ width: 16 }}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] transition-all ${
                      done
                        ? "bg-blue-500/20 border border-blue-500/40 text-blue-400"
                        : "bg-gray-800 border border-gray-700 text-gray-700"
                    }`}>
                      {done ? "✓" : "·"}
                    </div>
                    {!isLast && (
                      <div className={`w-px flex-1 my-0.5 transition-colors ${done ? "bg-blue-500/20" : "bg-gray-800"}`} style={{ minHeight: 12 }} />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pb-2">
                    <span className={`text-[11px] font-medium transition-colors ${done ? "text-gray-300" : "text-gray-700"}`}>
                      {step.icon} {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last Signal */}
        {signal && (
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold mb-2">Last Signal</p>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-bold tracking-wide ${dirColor}`}>
                {direction?.toUpperCase() ?? "—"}
              </span>
              {latestTrade?.action && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  latestTrade.action === "buy"
                    ? "bg-green-500/15 text-green-400 ring-1 ring-green-500/25"
                    : latestTrade.action === "sell"
                    ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/25"
                    : "bg-gray-800 text-gray-500"
                }`}>
                  {latestTrade.action?.toUpperCase()}
                </span>
              )}
            </div>
            <ConfidenceBar value={signal.confidence} />
            {signal.reasoning && (
              <p className="text-[10px] text-gray-600 mt-2 leading-relaxed line-clamp-3">
                {signal.reasoning}
              </p>
            )}
          </div>
        )}

        {/* Decision reasoning */}
        {latestTrade?.reasoning && (
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold mb-1.5">Decision Reasoning</p>
            <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-4">
              {latestTrade.reasoning}
            </p>
          </div>
        )}

        {/* On-chain proofs */}
        {latestTrade && (
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold mb-2">On-chain Proof</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600">x402 Payment</span>
                <TxChip hash={latestTrade.payment_tx_hash} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600">Attestation</span>
                <TxChip hash={latestTrade.attestation_tx_hash} />
              </div>
            </div>
          </div>
        )}

        {/* Recent activity log */}
        <div className="px-4 py-3">
          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold mb-2">Recent Activity</p>
          <div className="flex flex-col gap-1.5">
            {recentTrades.map((t) => {
              const actionColor =
                t.action === "buy" ? "text-green-400" :
                t.action === "sell" ? "text-red-400" : "text-gray-600";
              return (
                <div key={t.id} className="flex items-center justify-between py-1 border-b border-white/[0.03] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold font-mono ${actionColor}`}>
                      {t.action?.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-gray-600">{t.instrument}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-700 font-mono">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
            {recentTrades.length === 0 && (
              <p className="text-[10px] text-gray-700 italic">No activity yet…</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
