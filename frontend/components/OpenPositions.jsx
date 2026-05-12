"use client";

import { useState } from "react";

export default function OpenPositions({ positions, currentPrice, onClose }) {
  const [confirming, setConfirming] = useState(null);
  const [closing, setClosing] = useState(null);

  const handleCloseClick = (instrument) => setConfirming(instrument);
  const handleCancel = () => setConfirming(null);
  const handleConfirm = async (instrument) => {
    setConfirming(null);
    setClosing(instrument);
    try {
      await onClose(instrument);
    } finally {
      setClosing(null);
    }
  };

  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-20 text-gray-700">
        <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600">No open positions</p>
          <p className="text-xs text-gray-700 mt-1">Agent will enter positions on strong signals</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-left sticky top-0 bg-[#030712]/95 backdrop-blur-sm border-b border-white/5">
              <th className="px-4 py-3 font-medium tracking-wide">Symbol</th>
              <th className="px-4 py-3 font-medium tracking-wide">Side</th>
              <th className="px-4 py-3 font-medium tracking-wide">Size</th>
              <th className="px-4 py-3 font-medium tracking-wide">Entry</th>
              <th className="px-4 py-3 font-medium tracking-wide">Mark</th>
              <th className="px-4 py-3 font-medium tracking-wide">Unrealised P&L</th>
              <th className="px-4 py-3 font-medium tracking-wide">Exposure</th>
              <th className="px-4 py-3 font-medium tracking-wide w-24"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => {
              const side = pos.side || "long";
              const units = pos.size_usd / pos.entry_price;
              let unrealised = 0;
              if (currentPrice) {
                unrealised = side === "long"
                  ? units * (currentPrice - pos.entry_price)
                  : units * (pos.entry_price - currentPrice);
              }
              const isProfit = unrealised >= 0;
              const pnlPct = (unrealised / pos.size_usd) * 100;
              const isConfirming = confirming === pos.instrument;
              const isClosing = closing === pos.instrument;

              return (
                <tr
                  key={i}
                  className={`border-b border-white/[0.04] transition-colors ${
                    isConfirming ? "bg-red-500/5" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-4 py-3.5 font-mono font-semibold text-white">{pos.instrument}</td>

                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                      side === "long"
                        ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                        : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                    }`}>
                      {side === "long" ? "▲" : "▼"} {side.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 tabular-nums text-gray-300">
                    ${pos.size_usd.toLocaleString()}
                  </td>

                  <td className="px-4 py-3.5 font-mono tabular-nums text-gray-500">
                    {pos.entry_price.toFixed(2)}
                  </td>

                  <td className="px-4 py-3.5 font-mono tabular-nums text-white">
                    {currentPrice ? currentPrice.toFixed(2) : "—"}
                  </td>

                  <td className={`px-4 py-3.5 font-mono tabular-nums font-semibold ${isProfit ? "text-green-400" : "text-red-400"}`}>
                    <div className="flex items-center gap-2">
                      <span>{isProfit ? "+" : ""}{unrealised.toFixed(2)}</span>
                      <span className={`text-[10px] opacity-60`}>
                        {isProfit ? "+" : ""}{pnlPct.toFixed(2)}%
                      </span>
                    </div>
                  </td>

                  {/* Exposure bar: shows position size vs $1000 max */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            side === "long" ? "bg-green-500/60" : "bg-red-500/60"
                          }`}
                          style={{ width: `${Math.min(100, (pos.size_usd / 1000) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-600 font-mono">{((pos.size_usd / 1000) * 100).toFixed(0)}%</span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleConfirm(pos.instrument)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-500/20 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/30 transition-all"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-2.5 py-1 rounded-md text-[11px] text-gray-500 hover:text-gray-300 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : isClosing ? (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <div className="w-3 h-3 border border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                        <span className="text-[11px]">Closing…</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCloseClick(pos.instrument)}
                        className="px-3 py-1 rounded-md text-[11px] font-medium bg-white/5 text-gray-500 hover:bg-red-500/15 hover:text-red-400 hover:ring-1 hover:ring-red-500/25 transition-all"
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
