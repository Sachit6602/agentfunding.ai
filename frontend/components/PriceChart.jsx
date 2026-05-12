"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Customized,
} from "recharts";

/* ── EMA calculation ─────────────────────────────────────── */
function calcEMA(prices, period) {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(prices.length).fill(null);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

/* ── OHLC aggregation ─────────────────────────────────────── */
function toCandles(data, targetBars = 60) {
  if (!data.length) return [];
  const groupSize = Math.max(1, Math.floor(data.length / targetBars));
  return Array.from({ length: Math.ceil(data.length / groupSize) }, (_, i) => {
    const chunk = data.slice(i * groupSize, (i + 1) * groupSize);
    const prices = chunk.map((d) => d.price);
    return {
      timestamp: chunk[Math.floor(chunk.length / 2)].timestamp,
      open: chunk[0].price,
      close: chunk[chunk.length - 1].price,
      high: Math.max(...prices),
      low: Math.min(...prices),
    };
  });
}

/* ── Tooltips ─────────────────────────────────────────────── */
const LineTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#0a1020]/95 border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl backdrop-blur-xl">
      <div className="text-gray-500 mb-1.5 text-[10px]">
        {new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-white font-mono font-bold text-sm">{d.price?.toFixed(2)}</div>
      {d.ema9 != null && (
        <div className="flex gap-3 mt-1.5 text-[10px]">
          <span className="text-orange-400">EMA9 {d.ema9.toFixed(2)}</span>
          <span className="text-purple-400">EMA21 {d.ema21?.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};

const CandleTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d?.open) return null;
  const isGreen = d.close >= d.open;
  return (
    <div className="bg-[#0a1020]/95 border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl backdrop-blur-xl">
      <div className="text-gray-500 mb-1.5 text-[10px]">{new Date(d.timestamp).toLocaleTimeString()}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
        <span className="text-gray-500">O</span><span className="text-gray-200">{d.open.toFixed(2)}</span>
        <span className="text-gray-500">H</span><span className="text-green-400">{d.high.toFixed(2)}</span>
        <span className="text-gray-500">L</span><span className="text-red-400">{d.low.toFixed(2)}</span>
        <span className="text-gray-500">C</span>
        <span className={isGreen ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
          {d.close.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

/* ── Candle SVG layer ─────────────────────────────────────── */
function makeCandleLayer(candles, yMin, yMax) {
  return function CandlesLayer({ offset }) {
    if (!offset || !candles.length) return null;
    const { top, left, width, height } = offset;
    const toY = (v) => top + height - ((v - yMin) / (yMax - yMin)) * height;
    const n = candles.length;
    const slotW = width / n;
    const toX = (i) => left + (i + 0.5) * slotW;
    const hw = Math.max(slotW * 0.38, 1.5);

    return (
      <g>
        {candles.map((d, i) => {
          const isGreen = d.close >= d.open;
          const stroke = isGreen ? "#22c55e" : "#ef4444";
          const fill   = isGreen ? "#14532d" : "#7f1d1d";
          const cx = toX(i);
          const yO = toY(d.open), yC = toY(d.close);
          const bodyTop = Math.min(yO, yC);
          const bodyH = Math.max(Math.abs(yO - yC), 1.5);
          return (
            <g key={i}>
              <line x1={cx} y1={toY(d.high)} x2={cx} y2={toY(d.low)} stroke={stroke} strokeWidth={1} opacity={0.7} />
              <rect x={cx - hw / 2} y={bodyTop} width={hw} height={bodyH} fill={fill} stroke={stroke} strokeWidth={0.8} rx={1} />
            </g>
          );
        })}
      </g>
    );
  };
}

/* ── Trade signal markers ────────────────────────────────── */
function makeSignalLayer(trades, data, yMin, yMax) {
  if (!trades?.length || !data?.length) return () => null;
  const priceMap = new Map(data.map((d) => [d.timestamp, d.price]));

  return function SignalLayer({ offset }) {
    if (!offset) return null;
    const { top, left, width, height } = offset;
    const n = data.length;
    const slotW = width / n;
    const toY = (v) => top + height - ((v - yMin) / (yMax - yMin)) * height;

    return (
      <g>
        {trades.filter((t) => t.action !== "hold" && t.entry_price).map((t, i) => {
          // find nearest data point by timestamp
          const idx = data.findIndex((d) => d.timestamp >= t.timestamp);
          if (idx < 0) return null;
          const cx = left + (idx + 0.5) * slotW;
          const cy = toY(t.entry_price);
          const isBuy = t.action === "buy";
          const color = isBuy ? "#22c55e" : "#ef4444";
          const yOff = isBuy ? 10 : -10;

          return (
            <g key={t.id || i}>
              <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.9} />
              <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.15} />
              <text
                x={cx}
                y={cy + yOff + (isBuy ? 4 : -2)}
                textAnchor="middle"
                fontSize={8}
                fill={color}
                fontFamily="monospace"
                opacity={0.8}
              >
                {isBuy ? "B" : "S"}
              </text>
            </g>
          );
        })}
      </g>
    );
  };
}

/* ── Main component ───────────────────────────────────────── */
export default function PriceChart({ data, positions, trades }) {
  const [chartType, setChartType] = useState("line");
  const [showEMA, setShowEMA] = useState(true);
  const [showSignals, setShowSignals] = useState(true);

  const enriched = useMemo(() => {
    if (!data?.length) return [];
    const prices = data.map((d) => d.price);
    const ema9 = calcEMA(prices, 9);
    const ema21 = calcEMA(prices, 21);
    return data.map((d, i) => ({ ...d, ema9: ema9[i], ema21: ema21[i] }));
  }, [data]);

  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[280px] gap-2 text-gray-700">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs">Waiting for price data…</span>
      </div>
    );
  }

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pad  = (maxP - minP) * 0.12 || 1;
  const yMin = minP - pad;
  const yMax = maxP + pad;

  const candles = toCandles(data);
  const CandlesLayer = makeCandleLayer(candles, yMin, yMax);
  const SignalLayer = showSignals ? makeSignalLayer(trades, enriched, yMin, yMax) : () => null;

  const entryLines = (positions || []).map((p) => ({ price: p.entry_price, side: p.side || "long" }));

  const xAxisProps = {
    dataKey: "timestamp",
    tickFormatter: (v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    tick: { fill: "#4b5563", fontSize: 10 },
    axisLine: false,
    tickLine: false,
    interval: "preserveStartEnd",
    minTickGap: 70,
  };

  const yAxisProps = {
    domain: [yMin, yMax],
    tick: { fill: "#4b5563", fontSize: 10 },
    axisLine: false,
    tickLine: false,
    width: 62,
    tickFormatter: (v) => v.toFixed(1),
    orientation: "right",
  };

  const refLines = entryLines.map((el, i) => (
    <ReferenceLine
      key={i}
      y={el.price}
      stroke={el.side === "long" ? "#22c55e" : "#ef4444"}
      strokeDasharray="5 3"
      strokeOpacity={0.6}
      label={{
        value: `${el.side === "long" ? "LONG" : "SHORT"} ${el.price.toFixed(2)}`,
        fill: el.side === "long" ? "#22c55e" : "#ef4444",
        fontSize: 9,
        position: "insideTopLeft",
        opacity: 0.8,
      }}
    />
  ));

  return (
    <div className="relative">
      {/* Controls row */}
      <div className="absolute top-0 right-0 z-10 flex items-center gap-2">
        {/* EMA toggle */}
        <button
          onClick={() => setShowEMA((v) => !v)}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all border ${
            showEMA
              ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
              : "bg-gray-800/60 border-gray-700 text-gray-600 hover:text-gray-400"
          }`}
        >
          EMA
        </button>
        {/* Signals toggle */}
        <button
          onClick={() => setShowSignals((v) => !v)}
          className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all border ${
            showSignals
              ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
              : "bg-gray-800/60 border-gray-700 text-gray-600 hover:text-gray-400"
          }`}
        >
          Signals
        </button>
        {/* Chart type */}
        <div className="flex rounded overflow-hidden border border-gray-700/80">
          {[["line", "Line"], ["candle", "Candles"]].map(([type, label]) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-2.5 py-1 text-[10px] font-medium transition-all ${
                chartType === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800/80 text-gray-500 hover:text-gray-300 hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* EMA legend */}
      {showEMA && chartType === "line" && (
        <div className="absolute top-0 left-0 z-10 flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded" />EMA 9</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-400 inline-block rounded" />EMA 21</span>
        </div>
      )}

      {chartType === "line" ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={enriched} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<LineTooltip />} />
            {refLines}
            {showEMA && (
              <>
                <Line type="monotone" dataKey="ema9" stroke="#f97316" strokeWidth={1} dot={false} strokeOpacity={0.7} connectNulls />
                <Line type="monotone" dataKey="ema21" stroke="#a855f7" strokeWidth={1} dot={false} strokeOpacity={0.7} connectNulls />
              </>
            )}
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="url(#priceGrad)"
              dot={false}
              activeDot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
            />
            {showSignals && <Customized component={SignalLayer} />}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={candles} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CandleTooltip />} />
            {refLines}
            <Customized component={CandlesLayer} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
