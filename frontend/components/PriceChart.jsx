"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Customized,
} from "recharts";

/* ── OHLC aggregation ─────────────────────────────────────── */
function toCandles(data, targetBars = 60) {
  if (!data.length) return [];
  const groupSize = Math.max(1, Math.floor(data.length / targetBars));
  const out = [];
  for (let i = 0; i < data.length; i += groupSize) {
    const chunk = data.slice(i, i + groupSize);
    const prices = chunk.map((d) => d.price);
    out.push({
      timestamp: chunk[Math.floor(chunk.length / 2)].timestamp,
      open: chunk[0].price,
      close: chunk[chunk.length - 1].price,
      high: Math.max(...prices),
      low: Math.min(...prices),
    });
  }
  return out;
}

/* ── Tooltips ─────────────────────────────────────────────── */
const LineTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-gray-400 mb-1">{new Date(d.timestamp).toLocaleTimeString()}</div>
      <div className="text-white font-mono font-bold text-sm">{d.price.toFixed(4)}</div>
    </div>
  );
};

const CandleTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d?.open) return null;
  const isGreen = d.close >= d.open;
  return (
    <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-gray-400 mb-1.5">{new Date(d.timestamp).toLocaleTimeString()}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
        <span className="text-gray-500">O</span>
        <span className="text-gray-200">{d.open.toFixed(2)}</span>
        <span className="text-gray-500">H</span>
        <span className="text-green-400">{d.high.toFixed(2)}</span>
        <span className="text-gray-500">L</span>
        <span className="text-red-400">{d.low.toFixed(2)}</span>
        <span className="text-gray-500">C</span>
        <span className={isGreen ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
          {d.close.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

/* ── Candle SVG layer ─────────────────────────────────────── */
// Built as a factory so candles + domain are captured in the closure,
// not relying on recharts injecting them via props (which is unreliable).
function makeCandleLayer(candles, yMin, yMax) {
  return function CandlesLayer({ offset }) {
    if (!offset || !candles.length) return null;

    const { top, left, width, height } = offset;

    // Y: linear map from price domain to pixel range
    const toY = (v) => top + height - ((v - yMin) / (yMax - yMin)) * height;

    // X: equal-width slots (categorical, index-based — matches default XAxis)
    const n = candles.length;
    const slotW = width / n;
    const toX = (i) => left + (i + 0.5) * slotW;
    const hw = Math.max(slotW * 0.4, 2);

    return (
      <g>
        {candles.map((d, i) => {
          const isGreen = d.close >= d.open;
          const stroke = isGreen ? "#22c55e" : "#ef4444";
          const fill   = isGreen ? "#14532d" : "#7f1d1d";
          const cx     = toX(i);
          const yH     = toY(d.high);
          const yL     = toY(d.low);
          const yO     = toY(d.open);
          const yC     = toY(d.close);
          const bodyTop = Math.min(yO, yC);
          const bodyH   = Math.max(Math.abs(yO - yC), 1.5);

          return (
            <g key={i}>
              <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={stroke} strokeWidth={1.2} />
              <rect
                x={cx - hw / 2} y={bodyTop}
                width={hw}       height={bodyH}
                fill={fill}      stroke={stroke}
                strokeWidth={1}  rx={1}
              />
            </g>
          );
        })}
      </g>
    );
  };
}

/* ── Main component ───────────────────────────────────────── */
export default function PriceChart({ data, positions }) {
  const [chartType, setChartType] = useState("line");

  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-gray-600">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm">Waiting for price data… (agent cycles every 30s)</span>
      </div>
    );
  }

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pad  = (maxP - minP) * 0.1 || 1;
  const yMin = minP - pad;
  const yMax = maxP + pad;

  const candles = toCandles(data);

  // Build the candle renderer (plain factory call, not a hook)
  const CandlesLayer = makeCandleLayer(candles, yMin, yMax);

  const entryLines = (positions || []).map((p) => ({
    price: p.entry_price,
    side: p.side || "long",
  }));

  const xAxisProps = {
    tick: { fill: "#6b7280", fontSize: 10 },
    axisLine: false,
    tickLine: false,
    interval: "preserveStartEnd",
    minTickGap: 60,
  };

  const yAxisProps = {
    domain: [yMin, yMax],
    tick: { fill: "#6b7280", fontSize: 10 },
    axisLine: false,
    tickLine: false,
    width: 65,
    tickFormatter: (v) => v.toFixed(2),
    orientation: "right",
  };

  const refLines = entryLines.map((el, i) => (
    <ReferenceLine
      key={i}
      y={el.price}
      stroke={el.side === "long" ? "#22c55e" : "#ef4444"}
      strokeDasharray="4 3"
      label={{
        value: `${el.side.toUpperCase()} ${el.price.toFixed(2)}`,
        fill: el.side === "long" ? "#22c55e" : "#ef4444",
        fontSize: 10,
        position: "insideTopLeft",
      }}
    />
  ));

  return (
    <div className="relative">
      {/* Toggle */}
      <div className="absolute top-0 right-0 z-10 flex rounded-md overflow-hidden border border-gray-700">
        {[["line", "Line"], ["candle", "Candles"]].map(([type, label]) => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            className={`px-3 py-1 text-[11px] font-medium transition-all ${
              chartType === type
                ? "bg-blue-600 text-white"
                : "bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {chartType === "line" ? (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) =>
                new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
              {...xAxisProps}
            />
            <YAxis {...yAxisProps} />
            <Tooltip content={<LineTooltip />} />
            {refLines}
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="url(#priceGrad)"
              dot={false}
              activeDot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={candles} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) =>
                new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
              {...xAxisProps}
            />
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
