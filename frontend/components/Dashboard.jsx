"use client";

import { useEffect, useState } from "react";
import { fetchTrades, fetchPortfolio, fetchAgentStatus } from "@/lib/api";
import PaymentLog from "./PaymentLog";
import AttestationLog from "./AttestationLog";

const KITE_EXPLORER = "https://explorer.testnet.kite.ai/tx";

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [agentStatus, setAgentStatus] = useState("loading");

  useEffect(() => {
    const poll = async () => {
      try {
        const [t, p, s] = await Promise.all([
          fetchTrades(),
          fetchPortfolio(),
          fetchAgentStatus(),
        ]);
        setTrades(t);
        setPortfolio(p);
        setAgentStatus(s.status);
      } catch {
        setAgentStatus("offline");
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const pnlColor =
    portfolio && portfolio.pnl >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              agentStatus === "running"
                ? "bg-green-400 animate-pulse"
                : "bg-red-400"
            }`}
          />
          <span className="text-sm font-medium capitalize">
            Agent {agentStatus}
          </span>
        </div>
        {portfolio && (
          <div className="flex gap-6 text-sm">
            <span className="text-gray-400">
              Cash:{" "}
              <span className="text-white font-mono">
                ${portfolio.cash.toFixed(2)}
              </span>
            </span>
            <span className="text-gray-400">
              P&amp;L:{" "}
              <span className={`font-mono font-semibold ${pnlColor}`}>
                {portfolio.pnl >= 0 ? "+" : ""}
                {portfolio.pnl.toFixed(2)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Trade feed */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="font-semibold">Trade Feed</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800 text-left">
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Instrument</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Size (USD)</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Signal</th>
                <th className="px-4 py-2">Attestation</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-800 hover:bg-gray-800/40"
                >
                  <td className="px-4 py-2 text-gray-400 tabular-nums">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2 font-mono">{t.instrument}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        t.action === "buy"
                          ? "bg-green-900/60 text-green-300"
                          : t.action === "sell"
                          ? "bg-red-900/60 text-red-300"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {t.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    ${t.size_usd.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono tabular-nums">
                    {t.entry_price.toFixed(4)}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400">
                    {t.signal?.direction}{" "}
                    <span className="text-gray-500">
                      ({t.signal?.confidence?.toFixed(2)})
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {t.attestation_tx_hash ? (
                      <a
                        href={`${KITE_EXPLORER}/${t.attestation_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline font-mono text-xs"
                      >
                        {t.attestation_tx_hash.slice(0, 10)}…
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-600"
                  >
                    Waiting for first cycle…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PaymentLog trades={trades} />
        <AttestationLog trades={trades} />
      </div>
    </div>
  );
}
