"use client";

import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface KpiData {
  solPrice: number;
  solChange: number;
  multiplier: number;
  totalUpdates: number;
  tps: number;
  uptime: string;
}

function AnimatedNumber({ value, decimals = 2, prefix = "", suffix = "" }: {
  value: number; decimals?: number; prefix?: string; suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (Math.abs(value - prevRef.current) < 0.001) return;
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span>{prefix}{display.toFixed(decimals)}{suffix}</span>
  );
}

export function KpiBar() {
  const [kpi, setKpi] = useState<KpiData>({
    solPrice: 0, solChange: 0, multiplier: 1.0,
    totalUpdates: 0, tps: 0, uptime: "—",
  });

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [priceRes, statusRes, analysisRes, networkRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/sol-price`),
          fetch(`${API_BASE}/api/status`),
          fetch(`${API_BASE}/api/current-analysis`),
          fetch(`${API_BASE}/api/network-stats`),
        ]);

        let solPrice = 0, solChange = 0, multiplier = 1.0, totalUpdates = 0, tps = 0, uptime = "—";

        if (priceRes.status === "fulfilled" && priceRes.value.ok) {
          const d = await priceRes.value.json();
          solPrice = d.usd ?? 0;
          solChange = d.usd_24h_change ?? 0;
        }
        if (statusRes.status === "fulfilled" && statusRes.value.ok) {
          const d = await statusRes.value.json();
          totalUpdates = d.totalUpdates ?? 0;
          const ms = d.uptimeMs ?? 0;
          const h = Math.floor(ms / 3600000);
          const m = Math.floor((ms % 3600000) / 60000);
          uptime = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
        if (analysisRes.status === "fulfilled" && analysisRes.value.ok) {
          const d = await analysisRes.value.json();
          multiplier = d.multiplier ?? 1.0;
        }
        if (networkRes.status === "fulfilled" && networkRes.value.ok) {
          const d = await networkRes.value.json();
          tps = d.tps ?? 0;
        }

        setKpi({ solPrice, solChange, multiplier, totalUpdates, tps, uptime });
      } catch {}
    };

    fetch_();
    const interval = setInterval(fetch_, 10_000);
    return () => clearInterval(interval);
  }, []);

  const multiplierClass = kpi.multiplier > 1.05 ? "text-neon-green" : kpi.multiplier < 0.95 ? "text-neon-red" : "text-[var(--text-primary)]";
  const changeClass = kpi.solChange >= 0 ? "text-neon-green" : "text-neon-red";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 anim-1">

      {/* SOL Price */}
      <div className="glass-card neon-top p-4 scanline">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(0,180,255,0.15)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#00b4ff" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00b4ff" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>SOL / USD</span>
        </div>
        <div className="mono text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {kpi.solPrice > 0 ? (
            <><span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>$</span><AnimatedNumber value={kpi.solPrice} decimals={2} /></>
          ) : "—"}
        </div>
        <div className={`mono text-xs mt-1 ${changeClass}`}>
          {kpi.solChange >= 0 ? "▲" : "▼"} {Math.abs(kpi.solChange).toFixed(2)}% 24h
        </div>
      </div>

      {/* Multiplier */}
      <div className="glass-card neon-top p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(0,255,180,0.15)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#00ffb4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>AI Multiplier</span>
        </div>
        <div className={`mono text-2xl font-bold ${multiplierClass}`}>
          <AnimatedNumber value={kpi.multiplier} decimals={2} suffix="×" />
        </div>
        <div className="mono text-xs mt-1" style={{ color: "var(--text-dim)" }}>
          {kpi.multiplier > 1.05 ? "↑ High demand" : kpi.multiplier < 0.95 ? "↓ Low demand" : "→ Stable"}
        </div>
      </div>

      {/* Updates */}
      <div className="glass-card neon-top p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(155,93,229,0.15)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="#9b5de5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Chain Updates</span>
        </div>
        <div className="mono text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          <AnimatedNumber value={kpi.totalUpdates} decimals={0} />
        </div>
        <div className="mono text-xs mt-1" style={{ color: "var(--text-dim)" }}>Uptime: {kpi.uptime}</div>
      </div>

      {/* TPS */}
      <div className="glass-card neon-top p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(255,165,2,0.15)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#ffa502" strokeWidth="2"/>
              <polyline points="12 6 12 12 16 14" stroke="#ffa502" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Network TPS</span>
        </div>
        <div className="mono text-2xl font-bold" style={{ color: "var(--neon-orange)" }}>
          {kpi.tps > 0 ? <AnimatedNumber value={kpi.tps} decimals={0} /> : "—"}
        </div>
        <div className="mono text-xs mt-1" style={{ color: "var(--text-dim)" }}>Solana Devnet</div>
      </div>
    </div>
  );
}
