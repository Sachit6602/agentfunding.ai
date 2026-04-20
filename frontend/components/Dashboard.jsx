"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchTrades,
  fetchPortfolio,
  fetchAgentStatus,
  fetchChart,
  closePosition,
} from "@/lib/api";
import PriceChart from "./PriceChart";
import OpenPositions from "./OpenPositions";
import TradeHistory from "./TradeHistory";

const TABS = ["Open Positions", "Trade History"];

function usePriceDirection(price) {
  const prev = useRef(null);
  const [dir, setDir] = useState(null);
  useEffect(() => {
    if (prev.current !== null && price !== null && price !== prev.current) {
      setDir(price > prev.current ? "up" : "down");
      const t = setTimeout(() => setDir(null), 800);
      return () => clearTimeout(t);
    }
    if (price !== null) prev.current = price;
  }, [price]);
  return dir;
}

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [agentStatus, setAgentStatus] = useState("loading");
  const [chartData, setChartData] = useState([]);
  const [activeTab, setActiveTab] = useState("Open Positions");
  const [closeMsg, setCloseMsg] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [t, p, s, c] = await Promise.all([
        fetchTrades(50),
        fetchPortfolio(),
        fetchAgentStatus(),
        fetchChart(),
      ]);
      setTrades(t);
      setPortfolio(p);
      setAgentStatus(s.status);
      setChartData(c);
      setLastUpdated(new Date());
    } catch {
      setAgentStatus("offline");
    } finally {
      if (manual) setTimeout(() => setRefreshing(false), 600);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleClose = async (instrument) => {
    try {
      const res = await closePosition(instrument);
      setCloseMsg({
        type: "success",
        text: `Closed ${instrument} @ ${res.closed.exit_price.toFixed(4)} — P&L: ${res.closed.realised_pnl >= 0 ? "+" : ""}${res.closed.realised_pnl.toFixed(2)}`,
      });
      setTimeout(() => setCloseMsg(null), 5000);
      await refresh();
    } catch (e) {
      setCloseMsg({ type: "error", text: `Error: ${e.message}` });
      setTimeout(() => setCloseMsg(null), 4000);
    }
  };

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : null;
  const priceDir = usePriceDirection(currentPrice);
  const positions = portfolio?.positions || [];
  const pnl = portfolio?.pnl ?? 0;
  const cash = portfolio?.cash ?? 10000;

  const unrealised = positions.reduce((sum, pos) => {
    if (!currentPrice) return sum;
    const units = pos.size_usd / pos.entry_price;
    return sum + (pos.side === "short"
      ? units * (pos.entry_price - currentPrice)
      : units * (currentPrice - pos.entry_price));
  }, 0);

  const equity = cash + unrealised;
  const totalPnl = pnl + unrealised;
  const pnlPct = ((totalPnl / 10000) * 100);

  const prices = chartData.map((d) => d.price);
  const dayHigh = prices.length ? Math.max(...prices) : null;
  const dayLow = prices.length ? Math.min(...prices) : null;
  const priceRange = dayHigh && dayLow ? dayHigh - dayLow : 0;
  const pricePosition = dayHigh && dayLow && currentPrice
    ? ((currentPrice - dayLow) / priceRange) * 100
    : 50;

  return (
    <div className="h-screen bg-[#030712] text-gray-100 flex flex-col overflow-hidden font-sans">

      {/* ── Top header bar ── */}
      <header className="shrink-0 h-14 flex items-center justify-between px-5 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-white tracking-tight">agentfunding</span>
            <span className="text-gray-600 text-sm font-light">.exe</span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="relative flex h-1.5 w-1.5">
              {agentStatus === "running" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${agentStatus === "running" ? "bg-green-400" : "bg-red-500"}`} />
            </span>
            <span className="text-[11px] text-gray-400 capitalize">{agentStatus}</span>
          </div>

          <span className="hidden md:inline-flex items-center text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1 tracking-wider">
            KITE AI TESTNET
          </span>
        </div>

        {/* Price + controls */}
        <div className="flex items-center gap-6">
          {dayHigh && dayLow && (
            <div className="hidden lg:flex items-center gap-4 text-xs">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[9px] text-gray-600 uppercase tracking-wider">Session Range</span>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-mono">{dayLow.toFixed(2)}</span>
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full"
                      style={{ width: `${Math.max(5, Math.min(95, pricePosition))}%` }}
                    />
                  </div>
                  <span className="text-green-400 font-mono">{dayHigh.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {currentPrice && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-xl font-mono font-bold tabular-nums transition-colors duration-300 ${
                  priceDir === "up" ? "text-green-400" : priceDir === "down" ? "text-red-400" : "text-white"
                }`}>
                  {currentPrice.toFixed(4)}
                  {priceDir && (
                    <span className={`ml-1.5 text-sm ${priceDir === "up" ? "text-green-400" : "text-red-400"}`}>
                      {priceDir === "up" ? "▲" : "▼"}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-gray-600 uppercase tracking-widest text-right">XAUUSD</div>
              </div>
            </div>
          )}

          <button
            onClick={() => refresh(true)}
            title="Refresh data"
            className={`p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Alert bar ── */}
      {closeMsg && (
        <div className={`shrink-0 flex items-center gap-2 px-5 py-2 text-sm border-b ${
          closeMsg.type === "error"
            ? "bg-red-500/10 border-red-500/20 text-red-300"
            : "bg-green-500/10 border-green-500/20 text-green-300"
        }`}>
          <span>{closeMsg.type === "error" ? "⚠" : "✓"}</span>
          {closeMsg.text}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-56 shrink-0 border-r border-white/5 bg-[#0a0f1e]/40 flex flex-col p-3 gap-2 overflow-y-auto">

          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-1 pt-1">Portfolio</p>

          <MetricCard label="Balance" value={`$${cash.toFixed(2)}`} />
          <MetricCard label="Equity" value={`$${equity.toFixed(2)}`} accent />

          <div className="my-1 border-t border-white/5" />

          <MetricCard
            label="Total P/L"
            value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
            sub={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
            color={totalPnl >= 0 ? "green" : "red"}
            large
          />
          <MetricCard
            label="Realised"
            value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
            color={pnl >= 0 ? "green" : "red"}
          />
          <MetricCard
            label="Unrealised"
            value={`${unrealised >= 0 ? "+" : ""}$${unrealised.toFixed(2)}`}
            color={unrealised >= 0 ? "green" : "red"}
          />

          <div className="my-1 border-t border-white/5" />
          <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-1">Activity</p>

          <div className="grid grid-cols-2 gap-2">
            <CountCard value={positions.length} label="open" color="blue" />
            <CountCard value={trades.length} label="trades" />
          </div>

          <div className="mt-auto pt-3 border-t border-white/5">
            {lastUpdated && (
              <p className="text-[9px] text-gray-700 text-center">
                {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Chart panel */}
          <section className="shrink-0 border-b border-white/5 bg-[#070d1a]/60">
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">XAUUSD</span>
                <span className="text-gray-700">·</span>
                <span className="text-xs text-gray-500">Gold / US Dollar</span>
                {chartData.length > 0 && (
                  <span className="ml-2 text-[10px] text-gray-700 font-mono">{chartData.length} pts</span>
                )}
              </div>
            </div>
            <div className="px-4 pb-3">
              <PriceChart data={chartData} positions={positions} />
            </div>
          </section>

          {/* Table area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="shrink-0 flex items-center border-b border-white/5 bg-[#0a0f1e]/60 px-1">
              {TABS.map((tab) => {
                const count = tab === "Open Positions" ? positions.length : trades.length;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                      isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 rounded-t-full" />
                    )}
                    {tab}
                    {count > 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isActive && tab === "Open Positions"
                          ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                          : "bg-white/5 text-gray-500"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Table content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "Open Positions" ? (
                <OpenPositions positions={positions} currentPrice={currentPrice} onClose={handleClose} />
              ) : (
                <TradeHistory trades={trades} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function MetricCard({ label, value, sub, color, accent, large }) {
  const valueColor =
    color === "green" ? "text-green-400"
    : color === "red" ? "text-red-400"
    : "text-white";

  return (
    <div className={`rounded-lg px-3 py-2.5 transition-all group ${
      accent
        ? "bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15"
        : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
    }`}>
      <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono font-semibold tabular-nums leading-none ${large ? "text-base" : "text-sm"} ${valueColor}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-[10px] font-mono mt-0.5 ${valueColor} opacity-60`}>{sub}</div>
      )}
    </div>
  );
}

function CountCard({ value, label, color }) {
  return (
    <div className={`rounded-lg p-2.5 text-center border ${
      color === "blue"
        ? "bg-blue-500/10 border-blue-500/20"
        : "bg-white/[0.03] border-white/[0.06]"
    }`}>
      <div className={`text-2xl font-bold tabular-nums leading-none ${color === "blue" ? "text-blue-400" : "text-white"}`}>
        {value}
      </div>
      <div className="text-[9px] text-gray-600 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}
