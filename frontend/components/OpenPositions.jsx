"use client";

export default function OpenPositions({ positions, currentPrice, onClose }) {
  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
        <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm">No open positions</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 text-left sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/80">
            <th className="px-4 py-3 font-medium tracking-wide">Symbol</th>
            <th className="px-4 py-3 font-medium tracking-wide">Side</th>
            <th className="px-4 py-3 font-medium tracking-wide">Size</th>
            <th className="px-4 py-3 font-medium tracking-wide">Entry</th>
            <th className="px-4 py-3 font-medium tracking-wide">Current</th>
            <th className="px-4 py-3 font-medium tracking-wide">P&amp;L</th>
            <th className="px-4 py-3 font-medium tracking-wide"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, i) => {
            const side = pos.side || "long";
            const units = pos.size_usd / pos.entry_price;
            let unrealised = 0;
            if (currentPrice) {
              unrealised =
                side === "long"
                  ? units * (currentPrice - pos.entry_price)
                  : units * (pos.entry_price - currentPrice);
            }
            const isProfit = unrealised >= 0;

            return (
              <tr
                key={i}
                className="border-b border-gray-800/50 hover:bg-gray-800/25 transition-colors group"
              >
                <td className="px-4 py-3 font-mono font-semibold text-white">
                  {pos.instrument}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                      side === "long"
                        ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                        : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                    }`}
                  >
                    {side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-300">
                  ${pos.size_usd.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-gray-400">
                  {pos.entry_price.toFixed(4)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-white">
                  {currentPrice ? currentPrice.toFixed(4) : "—"}
                </td>
                <td className={`px-4 py-3 font-mono tabular-nums font-semibold ${isProfit ? "text-green-400" : "text-red-400"}`}>
                  {isProfit ? "+" : ""}{unrealised.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onClose(pos.instrument)}
                    className="px-3 py-1 rounded-md text-[11px] font-medium bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 hover:ring-1 hover:ring-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                  >
                    Close
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
