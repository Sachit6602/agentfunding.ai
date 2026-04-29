"use client";

import { useState } from "react";

const KITE_EXPLORER = "https://testnet.kitescan.ai/tx";

function TxLink({ hash }) {
  if (!hash)
    return <span className="text-gray-700 italic">pending</span>;
  return (
    <a
      href={`${KITE_EXPLORER}/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors font-mono group"
    >
      <span>{hash.slice(0, 8)}…{hash.slice(-6)}</span>
      <svg className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function ChainProofRow({ trade, colSpan }) {
  return (
    <tr className="border-b border-gray-800/60 bg-[#070d1a]">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="flex flex-wrap gap-6">

          {/* x402 Payment proof */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-medium">
                x402 Payment
              </div>
              <TxLink hash={trade.payment_tx_hash} />
              {!trade.payment_tx_hash && (
                <p className="text-[10px] text-gray-700 mt-0.5">Data cost not paid yet</p>
              )}
            </div>
          </div>

          {/* Attestation proof */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-medium">
                On-chain Attestation
              </div>
              <TxLink hash={trade.attestation_tx_hash} />
              {!trade.attestation_tx_hash && (
                <p className="text-[10px] text-gray-700 mt-0.5">Not yet attested</p>
              )}
            </div>
          </div>

        </div>
      </td>
    </tr>
  );
}

export default function TradeHistory({ trades }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 text-left sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/80">
            <th className="px-4 py-3 font-medium tracking-wide w-4"></th>
            <th className="px-4 py-3 font-medium tracking-wide">Time</th>
            <th className="px-4 py-3 font-medium tracking-wide">Symbol</th>
            <th className="px-4 py-3 font-medium tracking-wide">Action</th>
            <th className="px-4 py-3 font-medium tracking-wide">Size</th>
            <th className="px-4 py-3 font-medium tracking-wide">Price</th>
            <th className="px-4 py-3 font-medium tracking-wide">Signal</th>
            <th className="px-4 py-3 font-medium tracking-wide">P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const isExpanded = expandedId === t.id;
            const hasProof = t.payment_tx_hash || t.attestation_tx_hash;

            return (
              <>
                <tr
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={`border-b border-gray-800/40 transition-colors cursor-pointer select-none ${
                    isExpanded
                      ? "bg-gray-800/30 border-gray-700/60"
                      : "hover:bg-gray-800/20"
                  }`}
                >
                  {/* Expand chevron */}
                  <td className="pl-4 py-3 text-gray-600">
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-90 text-blue-400" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </td>

                  <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-200 font-medium">
                    {t.instrument}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                      t.action === "buy"
                        ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                        : t.action === "sell"
                        ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                        : "bg-gray-800 text-gray-500"
                    }`}>
                      {t.action?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-300">
                    {t.size_usd > 0 ? `$${t.size_usd.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-gray-300">
                    {t.entry_price?.toFixed(4) ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={t.signal?.direction === "long" ? "text-green-400" : "text-red-400"}>
                      {t.signal?.direction}
                    </span>
                    {t.signal?.confidence != null && (
                      <span className="text-gray-600 ml-1">
                        {(t.signal.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums font-semibold">
                    {t.realised_pnl != null ? (
                      <span className={t.realised_pnl >= 0 ? "text-green-400" : "text-red-400"}>
                        {t.realised_pnl >= 0 ? "+" : ""}{t.realised_pnl.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>

                {isExpanded && (
                  <ChainProofRow key={`${t.id}-proof`} trade={t} colSpan={8} />
                )}
              </>
            );
          })}

          {trades.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-600">
                  <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">No trades yet — waiting for first agent cycle…</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
