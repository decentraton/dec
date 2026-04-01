"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line-hi)",
      borderRadius: "6px", padding: "9px 13px",
      fontFamily: "var(--mono)", fontSize: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    }}>
      <p style={{ color: "var(--t3)", marginBottom: "5px", letterSpacing: "0.06em" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke, fontVariantNumeric: "tabular-nums" }}>
          {p.dataKey === "price"
            ? `${Number(p.value).toFixed(3)}× multiplier`
            : `$${Number(p.value).toFixed(2)} SOL`}
        </p>
      ))}
    </div>
  );
};

export function PriceChart({ history }: { history: any[] }) {
  const data = useMemo(() => {
    if (!history?.length) return [{ time: "Now", price: 1, sol: null as number | null }];
    return history.map(e => ({
      time: new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(e.timestamp)),
      price: e.multiplier as number,
      sol: (e.solPrice ?? null) as number | null,
    }));
  }, [history]);

  const hasSol = data.some(d => d.sol !== null);

  return (
    <section aria-label="Price multiplier history chart" className="card accent-bar" style={{ padding: "20px 20px 12px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--t1)", marginBottom: "3px" }}>
            Multiplier History
          </h2>
          <p style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)", fontVariantNumeric: "tabular-nums" }}>
            AI-driven · {data.length} data points
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "20px", height: "2px", background: "var(--acid)", borderRadius: "1px" }} aria-hidden="true" />
            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Multiplier</span>
          </div>
          {hasSol && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "20px", height: "1px", background: "var(--cyan)", borderRadius: "1px", borderTop: "1px dashed var(--cyan)" }} aria-hidden="true" />
              <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>SOL/USD</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "240px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: hasSol ? 40 : 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gAcid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b8ff3c" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#b8ff3c" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3cffd5" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#3cffd5" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" stroke="transparent" tickLine={false}
              tick={{ fill: "var(--t3)", fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.04em" }} />
            <YAxis yAxisId="m" stroke="transparent" tickLine={false} domain={[0.3, 3.2]}
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
              tick={{ fill: "var(--t3)", fontSize: 9, fontFamily: "'IBM Plex Mono',monospace" }} />
            {hasSol && (
              <YAxis yAxisId="s" orientation="right" stroke="transparent" tickLine={false}
                tickFormatter={(v: number) => `$${v}`}
                tick={{ fill: "var(--t3)", fontSize: 9, fontFamily: "'IBM Plex Mono',monospace" }} />
            )}
            <ReferenceLine yAxisId="m" y={1}
              stroke="rgba(255,255,255,0.08)" strokeDasharray="6 4"
              label={{ value: "1.0× base", fill: "var(--t3)", fontSize: 8, fontFamily: "'IBM Plex Mono',monospace" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area yAxisId="m" type="monotone" dataKey="price"
              stroke="var(--acid)" strokeWidth={2} fill="url(#gAcid)"
              dot={false} activeDot={{ r: 4, fill: "var(--acid)", strokeWidth: 0 }} animationDuration={700} />
            {hasSol && (
              <Area yAxisId="s" type="monotone" dataKey="sol"
                stroke="var(--cyan)" strokeWidth={1.5} fill="url(#gCyan)"
                strokeDasharray="4 3" dot={false}
                activeDot={{ r: 3, fill: "var(--cyan)", strokeWidth: 0 }} animationDuration={700} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
