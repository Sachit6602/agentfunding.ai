"use client";

const KITE_EXPLORER = "https://testnet.kitescan.ai/tx";

function TxLink({ hash }) {
  if (!hash)
    return (
      <span className="inline-flex items-center gap-1 text-gray-700">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
        pending
      </span>
    );
  return (
    <a
      href={`${KITE_EXPLORER}/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-300 transition-colors font-mono group"
    >
      {hash.slice(0, 6)}…{hash.slice(-4)}
      <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

export default function TradeHistory({ trades }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 text-left sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/80">
            <th className="px-4 py-3 font-medium tracking-wide">Time</th>
            <th className="px-4 py-3 font-medium tracking-wide">Symbol</th>
            <th className="px-4 py-3 font-medium tracking-wide">Action</th>
            <th className="px-4 py-3 font-medium tracking-wide">Size</th>
            <th className="px-4 py-3 font-medium tracking-wide">Price</th>
            <th className="px-4 py-3 font-medium tracking-wide">Signal</th>
            <th className="px-4 py-3 font-medium tracking-wide">P&amp;L</th>
            <th className="px-4 py-3 font-medium tracking-wide">Attestation</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr
              key={t.id}
              className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors"
            >
              <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">
                {new Date(t.timestamp).toLocaleTimeString()}
              </td>
              <td className="px-4 py-3 font-mono text-gray-200 font-medium">
                {t.instrument}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                    t.action === "buy"
                      ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                      : t.action === "sell"
                      ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
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
              <td className="px-4 py-3">
                <TxLink hash={t.attestation_tx_hash} />
              </td>
            </tr>
          ))}
          {trades.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center">
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
