"use client";

import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function AnimNumber({ value, dec = 2, pre = "", suf = "" }: { value: number; dec?: number; pre?: string; suf?: string }) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (Math.abs(value - prev.current) < 0.0001) return;
    const s = prev.current, e = value, dur = 550, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const q = 1 - (1 - p) ** 3;
      setDisp(s + (e - s) * q);
      if (p < 1) requestAnimationFrame(tick); else prev.current = e;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{pre}{disp.toFixed(dec)}{suf}</span>;
}

interface Kpi { solPrice: number; solChange: number; multiplier: number; totalUpdates: number; tps: number; uptime: string; }

export function KpiBar() {
  const [k, setK] = useState<Kpi>({ solPrice: 0, solChange: 0, multiplier: 1, totalUpdates: 0, tps: 0, uptime: "—" });

  useEffect(() => {
    const go = async () => {
      const [pr, st, an, nw] = await Promise.allSettled([
        fetch(`${API_BASE}/api/sol-price`),
        fetch(`${API_BASE}/api/status`),
        fetch(`${API_BASE}/api/current-analysis`),
        fetch(`${API_BASE}/api/network-stats`),
      ]);
      let solPrice = 0, solChange = 0, multiplier = 1, totalUpdates = 0, tps = 0, uptime = "—";
      if (pr.status === "fulfilled" && pr.value.ok) { const d = await pr.value.json(); solPrice = d.usd ?? 0; solChange = d.usd_24h_change ?? 0; }
      if (st.status === "fulfilled" && st.value.ok) { const d = await st.value.json(); totalUpdates = d.totalUpdates ?? 0; const ms = d.uptimeMs ?? 0; const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4); uptime = h > 0 ? `${h}h ${m}m` : `${m}m`; }
      if (an.status === "fulfilled" && an.value.ok) { const d = await an.value.json(); multiplier = d.multiplier ?? 1; }
      if (nw.status === "fulfilled" && nw.value.ok) { const d = await nw.value.json(); tps = d.tps ?? 0; }
      setK({ solPrice, solChange, multiplier, totalUpdates, tps, uptime });
    };
    go();
    const i = setInterval(go, 12_000);
    return () => clearInterval(i);
  }, []);

  const mColor = k.multiplier > 1.05 ? "var(--neon-green)" : k.multiplier < 0.95 ? "var(--neon-red)" : "var(--text-primary)";
  const cColor = k.solChange >= 0 ? "var(--neon-green)" : "var(--neon-red)";

  const cards = [
    {
      label: "SOL / USD",
      value: k.solPrice > 0 ? <><span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>$</span><AnimNumber value={k.solPrice} dec={2} /></> : <span style={{ color: "var(--text-dim)" }}>—</span>,
      sub: <span style={{ color: cColor }}>{k.solChange >= 0 ? "▲" : "▼"} {Math.abs(k.solChange).toFixed(2)}%</span>,
      accent: "var(--neon-blue)",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      label: "AI Multiplier",
      value: <AnimNumber value={k.multiplier} dec={2} suf="×" />,
      sub: <span style={{ color: "var(--text-dim)" }}>{k.multiplier > 1.05 ? "Demand ↑" : k.multiplier < 0.95 ? "Demand ↓" : "Stable"}</span>,
      accent: mColor,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      label: "Chain Updates",
      value: <AnimNumber value={k.totalUpdates} dec={0} />,
      sub: <span style={{ color: "var(--text-dim)" }}>Uptime: {k.uptime}</span>,
      accent: "var(--neon-purple)",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      label: "Network TPS",
      value: k.tps > 0 ? <AnimNumber value={k.tps} dec={0} /> : <span style={{ color: "var(--text-dim)" }}>—</span>,
      sub: <span style={{ color: "var(--text-dim)" }}>Solana Devnet</span>,
      accent: "var(--neon-orange)",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
  ];

  return (
    <div className="anim-1" style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "12px",
      marginBottom: "24px",
    }}>
      {cards.map((c) => (
        <div key={c.label} className="glass-card" style={{ padding: "18px 20px" }}>
          {/* top accent bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: c.accent, opacity: 0.6, borderRadius: "14px 14px 0 0" }} />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
            <span className="section-label" style={{ marginBottom: 0 }}>{c.label}</span>
            <span style={{ color: c.accent, opacity: 0.8 }}>{c.icon}</span>
          </div>

          <div className="mono" style={{ fontSize: "26px", fontWeight: 700, color: c.accent, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: "6px" }}>
            {c.value}
          </div>

          <div className="mono" style={{ fontSize: "10px" }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
