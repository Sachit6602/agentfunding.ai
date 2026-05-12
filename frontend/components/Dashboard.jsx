"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchTrades,
  fetchPortfolio,
  fetchAgentStatus,
  fetchChart,
  closePosition,
} from "@/lib/api";
import { useToasts, ToastStack } from "./Toast";
import PriceChart from "./PriceChart";
import OpenPositions from "./OpenPositions";
import TradeHistory from "./TradeHistory";
import AgentFeed from "./AgentFeed";

const TABS = ["Positions", "History"];

function usePriceDirection(price) {
  const prev = useRef(null);
  const [dir, setDir] = useState(null);
  useEffect(() => {
    if (prev.current !== null && price !== null && price !== prev.current) {
      setDir(price > prev.current ? "up" : "down");
      const t = setTimeout(() => setDir(null), 900);
      return () => clearTimeout(t);
    }
    if (price !== null) prev.current = price;
  }, [price]);
  return dir;
}

function useKeyboard(handlers) {
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      handlers[e.key]?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlers]);
}

export default function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [agentStatus, setAgentStatus] = useState("loading");
  const [latestTrade, setLatestTrade] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [activeTab, setActiveTab] = useState("Positions");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedOpen, setFeedOpen] = useState(true);
  const { toasts, toast, dismissToast } = useToasts();

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
      setLatestTrade(s.latest_trade || null);
      setChartData(c);
      setLastUpdated(new Date());
    } catch (err) {
      setAgentStatus("offline");
      if (manual) toast.error(`Refresh failed: ${err.message}`);
    } finally {
      if (manual) setTimeout(() => setRefreshing(false), 600);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  useKeyboard({
    r: () => refresh(true),
    R: () => refresh(true),
    "1": () => setActiveTab("Positions"),
    "2": () => setActiveTab("History"),
    f: () => setFeedOpen((v) => !v),
    F: () => setFeedOpen((v) => !v),
  });

  const handleClose = async (instrument) => {
    try {
      const res = await closePosition(instrument);
      const pnl = res.closed.realised_pnl;
      toast.success(
        `Closed ${instrument} @ ${res.closed.exit_price.toFixed(2)} · P&L ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`
      );
      await refresh();
    } catch (e) {
      toast.error(`Close failed: ${e.message}`);
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
  const pnlPct = (totalPnl / 10000) * 100;

  const prices = chartData.map((d) => d.price);
  const dayHigh = prices.length ? Math.max(...prices) : null;
  const dayLow = prices.length ? Math.min(...prices) : null;
  const priceRange = dayHigh && dayLow ? dayHigh - dayLow : 0;
  const pricePosition = dayHigh && dayLow && currentPrice && priceRange
    ? ((currentPrice - dayLow) / priceRange) * 100
    : 50;

  const cycleCount = latestTrade?.cycle ?? null;

  return (
    <div className="h-screen bg-[#030712] text-gray-100 flex flex-col overflow-hidden font-sans">

      {/* ── Header ── */}
      <header className="shrink-0 h-13 flex items-center justify-between px-5 border-b border-white/5 bg-[#0a0f1e]/90 backdrop-blur-xl" style={{ height: 52 }}>
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-white tracking-tight">agentfunding</span>
            <span className="text-gray-600 text-sm font-light">.exe</span>
          </div>

          {/* Status pill */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] ${
            agentStatus === "running"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : agentStatus === "loading"
              ? "bg-gray-800 border-gray-700 text-gray-500"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <span className="relative flex h-1.5 w-1.5">
              {agentStatus === "running" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                agentStatus === "running" ? "bg-green-400" : agentStatus === "loading" ? "bg-gray-600" : "bg-red-500"
              }`} />
            </span>
            <span className="capitalize">{agentStatus}</span>
          </div>

          <span className="hidden md:inline-flex items-center text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-0.5 tracking-wider">
            KITE AI TESTNET
          </span>

          {cycleCount != null && (
            <span className="hidden lg:inline text-[10px] text-gray-600 font-mono">
              cycle #{cycleCount}
            </span>
          )}
        </div>

        {/* Right: price + controls */}
        <div className="flex items-center gap-5">
          {/* Session range */}
          {dayHigh && dayLow && priceRange > 0 && (
            <div className="hidden lg:flex items-center gap-3 text-xs">
              <span className="text-red-400 font-mono text-[11px]">{dayLow.toFixed(2)}</span>
              <div className="relative w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/40 via-yellow-400/40 to-green-500/40 rounded-full" />
                <div
                  className="absolute top-0 h-full w-1 bg-white rounded-full shadow shadow-white/50 -translate-x-0.5"
                  style={{ left: `${Math.max(2, Math.min(96, pricePosition))}%` }}
                />
              </div>
              <span className="text-green-400 font-mono text-[11px]">{dayHigh.toFixed(2)}</span>
            </div>
          )}

          {/* Live price */}
          {currentPrice && (
            <div className={`text-right transition-colors duration-300 ${
              priceDir === "up" ? "text-green-400" : priceDir === "down" ? "text-red-400" : "text-white"
            }`}>
              <div className="text-xl font-mono font-bold tabular-nums leading-none">
                {currentPrice.toFixed(2)}
                {priceDir && (
                  <span className={`ml-1 text-base ${priceDir === "up" ? "text-green-400" : "text-red-400"}`}>
                    {priceDir === "up" ? "▲" : "▼"}
                  </span>
                )}
              </div>
              <div className="text-[9px] text-gray-600 uppercase tracking-widest text-right mt-0.5">XAUUSD</div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFeedOpen((v) => !v)}
              title="Toggle agent feed (F)"
              className={`p-1.5 rounded-lg text-[11px] font-medium transition-all ${
                feedOpen ? "text-blue-400 bg-blue-500/10 border border-blue-500/20" : "text-gray-600 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => refresh(true)}
              title="Refresh (R)"
              className={`p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all ${refreshing ? "animate-spin" : ""}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Sidebar ── */}
        <aside className="w-56 shrink-0 border-r border-white/5 bg-[#0a0f1e]/40 flex flex-col p-3 gap-2 overflow-y-auto">
          <SectionLabel>Portfolio</SectionLabel>

          <StatCard label="Cash Balance" value={`$${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <StatCard label="Equity" value={`$${equity.toFixed(2)}`} accent />

          <div className="my-0.5 border-t border-white/5" />

          <StatCard
            label="Total P&L"
            value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
            sub={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
            color={totalPnl >= 0 ? "green" : "red"}
            large
          />
          <StatCard
            label="Realised"
            value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
            color={pnl >= 0 ? "green" : "red"}
          />
          <StatCard
            label="Unrealised"
            value={`${unrealised >= 0 ? "+" : ""}$${unrealised.toFixed(2)}`}
            color={unrealised >= 0 ? "green" : "red"}
          />

          {/* Drawdown bar */}
          {pnl < 0 && (
            <div className="px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="flex justify-between mb-1">
                <span className="text-[9px] text-gray-600 uppercase tracking-wider">Drawdown</span>
                <span className="text-[10px] text-red-400 font-mono">{Math.abs(pnlPct).toFixed(1)}%</span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500/60 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (Math.abs(pnl) / 500) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="my-0.5 border-t border-white/5" />
          <SectionLabel>Positions</SectionLabel>

          <div className="grid grid-cols-2 gap-1.5">
            <CountCard value={positions.length} label="open" color="blue" />
            <CountCard value={trades.length} label="trades" />
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-auto pt-3 border-t border-white/5 space-y-1">
            <p className="text-[9px] text-gray-700 uppercase tracking-widest font-semibold px-0.5">Shortcuts</p>
            {[["R", "Refresh"], ["F", "Toggle feed"], ["1/2", "Switch tab"]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <kbd className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded font-mono">{k}</kbd>
                <span className="text-[9px] text-gray-700">{v}</span>
              </div>
            ))}
            {lastUpdated && (
              <p className="text-[9px] text-gray-700 pt-1 tabular-nums">
                {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

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
              <PriceChart data={chartData} positions={positions} trades={trades} />
            </div>
          </section>

          {/* Tab bar */}
          <div className="shrink-0 flex items-center border-b border-white/5 bg-[#0a0f1e]/60 px-1">
            {TABS.map((tab) => {
              const count = tab === "Positions" ? positions.length : trades.length;
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
                      isActive && tab === "Positions"
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

          {/* Table area */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "Positions" ? (
              <OpenPositions positions={positions} currentPrice={currentPrice} onClose={handleClose} />
            ) : (
              <TradeHistory trades={trades} />
            )}
          </div>
        </main>

        {/* ── Agent Feed ── */}
        {feedOpen && (
          <AgentFeed
            agentStatus={agentStatus}
            latestTrade={latestTrade}
            trades={trades}
            cycleCount={cycleCount}
          />
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/* ── Sub-components ── */

function SectionLabel({ children }) {
  return (
    <p className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-1 pt-1">{children}</p>
  );
}

function StatCard({ label, value, sub, color, accent, large }) {
  const valueColor =
    color === "green" ? "text-green-400"
    : color === "red" ? "text-red-400"
    : "text-white";

  return (
    <div className={`rounded-lg px-3 py-2.5 transition-all ${
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
