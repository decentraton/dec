"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  defs,
  linearGradient,
  stop,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="mono" style={{
      background: "var(--bg-card)",
      border: "1px solid var(--bg-border-active)",
      borderRadius: "8px",
      padding: "10px 14px",
      fontSize: "11px",
    }}>
      <p style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke }}>
          {p.dataKey === "price" ? `${p.value.toFixed(3)}× multiplier` : `$${p.value.toFixed(2)} SOL`}
        </p>
      ))}
    </div>
  );
};

export function PriceChart({ history }: { history: any[] }) {
  const data = useMemo(() => {
    if (!history || history.length === 0) {
      return [{ time: "Now", price: 1.0 }];
    }
    return history.map((entry) => ({
      time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      price: entry.multiplier,
      solPrice: entry.solPrice ?? null,
    }));
  }, [history]);

  const hasSolData = data.some((d) => d.solPrice !== null);

  return (
    <div className="glass-card neon-top p-6 anim-4" style={{ height: "340px" }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 style={{ fontSize: "18px", color: "var(--text-primary)" }}>Price Multiplier History</h3>
          <p className="mono text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            AI-driven multiplier · {data.length} data points
          </p>
        </div>
        <div className="flex gap-4 mono text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: "var(--neon-green)" }} />
            <span style={{ color: "var(--text-secondary)" }}>Multiplier</span>
          </div>
          {hasSolData && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: "var(--neon-blue)" }} />
              <span style={{ color: "var(--text-secondary)" }}>SOL Price</span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ffb4" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00ffb4" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00b4ff" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#00b4ff" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 8" stroke="rgba(0,255,180,0.05)" />
          <XAxis
            dataKey="time"
            stroke="transparent"
            tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="transparent"
            tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
            tickLine={false}
            domain={[0.4, 3.2]}
            tickFormatter={(v: number) => `${v}×`}
          />
          {hasSolData && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="transparent"
              tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
              tickLine={false}
              tickFormatter={(v: number) => `$${v}`}
            />
          )}
          <ReferenceLine
            yAxisId="left"
            y={1.0}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="6 4"
            label={{ value: "1.0× base", fill: "var(--text-dim)", fontSize: 9, fontFamily: "'Space Mono', monospace" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="price"
            stroke="var(--neon-green)"
            strokeWidth={2.5}
            fill="url(#greenGradient)"
            dot={false}
            activeDot={{ r: 5, fill: "var(--neon-green)", strokeWidth: 0 }}
            animationDuration={800}
          />
          {hasSolData && (
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="solPrice"
              stroke="var(--neon-blue)"
              strokeWidth={1.5}
              fill="url(#blueGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--neon-blue)", strokeWidth: 0 }}
              strokeDasharray="4 2"
              animationDuration={800}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
