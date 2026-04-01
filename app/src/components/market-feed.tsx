"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Event {
  multiplier: number;
  reasoning: string;
  reasoningHash: string;
  timestamp: number;
  txSignature: string | null;
  event?: string;
  solPrice?: number;
  confidence?: number;
}

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  gpu_shortage: { label: "GPU Shortage", color: "var(--neon-red)", icon: "⚡" },
  bull_run: { label: "Bull Run", color: "var(--neon-green)", icon: "🚀" },
  low_demand: { label: "Low Demand", color: "var(--neon-blue)", icon: "↓" },
  autonomous: { label: "Autonomous", color: "var(--neon-purple)", icon: "🤖" },
  organic: { label: "Organic", color: "var(--neon-orange)", icon: "∿" },
};

function TimeAgo({ ts }: { ts: number }) {
  const [ago, setAgo] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60) setAgo(`${diff}s ago`);
      else if (diff < 3600) setAgo(`${Math.floor(diff / 60)}m ago`);
      else setAgo(`${Math.floor(diff / 3600)}h ago`);
    };
    calc();
    const i = setInterval(calc, 10000);
    return () => clearInterval(i);
  }, [ts]);
  return <span>{ago}</span>;
}

export function MarketFeed() {
  const [events, setEvents] = useState<Event[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/events-feed?limit=15`);
        if (res.ok) {
          const d = await res.json();
          setEvents(d.events || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    fetch_();
    const i = setInterval(fetch_, 8_000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="anim-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontSize: "20px", color: "var(--text-primary)" }}>Oracle Event Feed</h2>
          <p className="mono text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Live on-chain updates from AI agent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--neon-green)", color: "var(--neon-green)" }} />
          <span className="mono text-[10px] uppercase tracking-widest" style={{ color: "var(--neon-green)" }}>Live</span>
        </div>
      </div>

      <div className="space-y-2">
        {loading && (
          <div className="glass-card p-6 text-center">
            <p className="mono text-sm" style={{ color: "var(--text-secondary)" }}>Loading events...</p>
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="glass-card p-6 text-center">
            <p className="mono text-sm" style={{ color: "var(--text-secondary)" }}>
              No events yet. AI agent updates every 60 seconds.
            </p>
          </div>
        )}

        {events.map((ev, i) => {
          const meta = EVENT_LABELS[ev.event || "organic"] || EVENT_LABELS.organic;
          const isExp = expanded === i;
          const mChange = ((ev.multiplier - 1) * 100).toFixed(1);
          const mPositive = ev.multiplier >= 1;

          return (
            <div
              key={i}
              className="glass-card overflow-hidden transition-all duration-300 cursor-pointer"
              style={{ "--card-accent": meta.color } as React.CSSProperties}
              onClick={() => setExpanded(isExp ? null : i)}
            >
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 opacity-60" style={{ background: meta.color }} />

              <div className="pl-4 pr-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {meta.label}
                        </span>
                        {ev.confidence && (
                          <span className="mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${meta.color}18`, color: meta.color }}>
                            {ev.confidence}% conf.
                          </span>
                        )}
                      </div>
                      <p className="mono text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        <TimeAgo ts={ev.timestamp} />
                        {ev.solPrice ? ` · $${ev.solPrice.toFixed(2)} SOL` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Multiplier delta */}
                    <div className="text-right">
                      <div className="mono text-xs font-bold" style={{ color: mPositive ? "var(--neon-green)" : "var(--neon-red)" }}>
                        {mPositive ? "+" : ""}{mChange}%
                      </div>
                      <div className="mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
                        {ev.multiplier.toFixed(2)}×
                      </div>
                    </div>

                    {/* TX link */}
                    {ev.txSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${ev.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mono text-[10px] px-2 py-1 rounded transition-colors"
                        style={{ background: "rgba(0,255,180,0.08)", color: "var(--neon-green)", border: "1px solid rgba(0,255,180,0.15)" }}
                      >
                        TX ↗
                      </a>
                    )}

                    {/* Expand arrow */}
                    <svg
                      width="12" height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ transform: isExp ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "var(--text-dim)" }}
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Expanded reasoning */}
                {isExp && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--bg-border)" }}>
                    <p className="mono text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-dim)" }}>AI Reasoning</p>
                    <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{ev.reasoning}</p>
                    {ev.reasoningHash && (
                      <p className="mono text-[10px] mt-2 break-all" style={{ color: "var(--text-dim)" }}>
                        SHA-256: {ev.reasoningHash.slice(0, 32)}...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
