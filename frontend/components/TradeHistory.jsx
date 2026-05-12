"use client";

import { useState, useMemo } from "react";

const KITE_EXPLORER = "https://testnet.kitescan.ai/tx";

function TxLink({ hash }) {
  if (!hash) return <span className="text-gray-700 italic text-[10px]">pending</span>;
  return (
    <a
      href={`${KITE_EXPLORER}/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-mono text-[10px] group"
    >
      {hash.slice(0, 8)}…{hash.slice(-6)}
      <svg className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function ConfidenceBar({ value, direction }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = direction === "long" ? "bg-green-500" : direction === "short" ? "bg-red-500" : "bg-gray-600";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-600 tabular-nums">{pct}%</span>
    </div>
  );
}

function ExpandedRow({ trade, colSpan }) {
  return (
    <tr className="border-b border-white/[0.04] bg-[#070d1a]/80">
      <td colSpan={colSpan} className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Signal details */}
          {trade.signal && (
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold mb-2">Signal Details</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600">Direction</span>
                  <span className={`text-[11px] font-semibold ${
                    trade.signal.direction === "long" ? "text-green-400" :
                    trade.signal.direction === "short" ? "text-red-400" : "text-gray-500"
                  }`}>{trade.signal.direction?.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600">Confidence</span>
                  <ConfidenceBar value={trade.signal.confidence} direction={trade.signal.direction} />
                </div>
                {trade.signal.reasoning && (
                  <p className="text-[10px] text-gray-500 mt-2 leading-relaxed bg-white/[0.02] rounded p-2 border border-white/[0.04]">
                    {trade.signal.reasoning}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Decision reasoning */}
          {trade.reasoning && (
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold mb-2">Decision Reasoning</p>
              <p className="text-[10px] text-gray-500 leading-relaxed bg-white/[0.02] rounded p-2 border border-white/[0.04]">
                {trade.reasoning}
              </p>
            </div>
          )}

          {/* On-chain proof */}
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold mb-2">On-chain Proof</p>
            <div className="space-y-2">
              <div>
                <p className="text-[9px] text-gray-700 mb-0.5">x402 Payment</p>
                <TxLink hash={trade.payment_tx_hash} />
              </div>
              <div>
                <p className="text-[9px] text-gray-700 mb-0.5">Attestation</p>
                <TxLink hash={trade.attestation_tx_hash} />
              </div>
            </div>
          </div>

        </div>
      </td>
    </tr>
  );
}

const FILTERS = ["All", "buy", "sell", "hold"];

export default function TradeHistory({ trades }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filter !== "All" && t.action !== filter) return false;
      if (search && !t.instrument?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [trades, filter, search]);

  const buyCount = trades.filter((t) => t.action === "buy").length;
  const sellCount = trades.filter((t) => t.action === "sell").length;
  const holdCount = trades.filter((t) => t.action === "hold").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] bg-[#0a0f1e]/30">
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => {
            const count = f === "All" ? trades.length : f === "buy" ? buyCount : f === "sell" ? sellCount : holdCount;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  filter === f
                    ? f === "buy" ? "bg-green-500/15 text-green-400 ring-1 ring-green-500/25"
                    : f === "sell" ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/25"
                    : "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="text-[9px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter symbol…"
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1 text-[11px] text-gray-400 placeholder-gray-700 focus:outline-none focus:border-blue-500/40 focus:text-white transition-all w-32"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-left sticky top-0 bg-[#030712]/95 backdrop-blur-sm border-b border-white/[0.04]">
              <th className="px-4 py-3 w-5"></th>
              <th className="px-4 py-3 font-medium tracking-wide">Time</th>
              <th className="px-4 py-3 font-medium tracking-wide">Symbol</th>
              <th className="px-4 py-3 font-medium tracking-wide">Action</th>
              <th className="px-4 py-3 font-medium tracking-wide">Size</th>
              <th className="px-4 py-3 font-medium tracking-wide">Entry</th>
              <th className="px-4 py-3 font-medium tracking-wide">Signal</th>
              <th className="px-4 py-3 font-medium tracking-wide">Confidence</th>
              <th className="px-4 py-3 font-medium tracking-wide">Cycle</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const isExpanded = expandedId === t.id;
              return (
                <>
                  <tr
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={`border-b border-white/[0.03] transition-colors cursor-pointer select-none ${
                      isExpanded
                        ? "bg-white/[0.03] border-white/[0.06]"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="pl-4 py-3">
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${
                          isExpanded ? "rotate-90 text-blue-400" : "text-gray-700"
                        }`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>

                    <td className="px-4 py-3 text-gray-600 tabular-nums whitespace-nowrap font-mono text-[10px]">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>

                    <td className="px-4 py-3 font-mono text-gray-300 font-medium">{t.instrument}</td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                        t.action === "buy"
                          ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                          : t.action === "sell"
                          ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                          : "bg-gray-800/60 text-gray-600"
                      }`}>
                        {t.action?.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-4 py-3 tabular-nums text-gray-400">
                      {t.size_usd > 0 ? `$${t.size_usd.toLocaleString()}` : "—"}
                    </td>

                    <td className="px-4 py-3 font-mono tabular-nums text-gray-400">
                      {t.entry_price?.toFixed(2) ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {t.signal?.direction ? (
                        <span className={`text-[11px] font-semibold ${
                          t.signal.direction === "long" ? "text-green-400" :
                          t.signal.direction === "short" ? "text-red-400" : "text-gray-600"
                        }`}>
                          {t.signal.direction.toUpperCase()}
                        </span>
                      ) : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {t.signal?.confidence != null ? (
                        <ConfidenceBar value={t.signal.confidence} direction={t.signal?.direction} />
                      ) : "—"}
                    </td>

                    <td className="px-4 py-3 tabular-nums text-gray-700 font-mono text-[10px]">
                      #{t.cycle ?? "—"}
                    </td>
                  </tr>

                  {isExpanded && (
                    <ExpandedRow key={`${t.id}-exp`} trade={t} colSpan={9} />
                  )}
                </>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-700">
                    <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{trades.length === 0 ? "No trades yet" : "No trades match the filter"}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
