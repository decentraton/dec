"use client";

/**
 * Price History Chart
 *
 * Data source: the AI Agent keeps a rolling in-memory log of every analysis
 * entry (multiplier + timestamp). The frontend polls GET /api/current-analysis
 * which returns a `history` array. We render it here.
 *
 * NOTE: Solana's PriceHistory PDA stores only the last 10 entries on-chain
 * (ring buffer in state.rs). For the demo dashboard we use the agent's memory
 * because it avoids extra RPC deserialization and is always fresh.
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export function PriceChart({ history }: { history: any[] }) {
  const data = useMemo(() => {
    if (!history || history.length === 0) {
      return [{ time: "Now", price: 1.0 }];
    }
    return history.map((entry) => ({
      time: new Date(entry.timestamp).toLocaleTimeString(),
      price: entry.multiplier,
    }));
  }, [history]);

  return (
    <div className="p-6 bg-neutral-900/40 border border-neutral-800 rounded-2xl col-span-1 lg:col-span-3 h-80">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-medium tracking-tight text-neutral-200">
          Multiplier History
        </h3>
        <span className="text-xs text-neutral-500 font-mono">
          {data.length} data point{data.length !== 1 ? "s" : ""} (in-memory)
        </span>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="time" stroke="#888" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#888"
            fontSize={11}
            tickLine={false}
            domain={[0.4, 3.2]}
            tickFormatter={(value: number) => `${value}x`}
          />
          <ReferenceLine y={1.0} stroke="#555" strokeDasharray="6 4" label={{ value: "1.0x base", fill: "#666", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111",
              border: "1px solid #333",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            itemStyle={{ color: "#a855f7" }}
            formatter={(value: number) => [`${value}x`, "Multiplier"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#a855f7"
            strokeWidth={3}
            dot={{ r: 4, fill: "#a855f7" }}
            activeDot={{ r: 6 }}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
