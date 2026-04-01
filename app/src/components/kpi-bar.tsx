"use client";

import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function AnimNum({ to, dec = 2 }: { to: number; dec?: number }) {
  const [v, setV] = useState(to);
  const prev = useRef(to);
  useEffect(() => {
    if (Math.abs(to - prev.current) < 0.0001) return;
    const s = prev.current, dur = 600, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1), q = 1 - (1 - p) ** 3;
      setV(s + (to - s) * q);
      if (p < 1) requestAnimationFrame(tick); else prev.current = to;
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <>{v.toFixed(dec)}</>;
}

export function KpiBar() {
  const [d, setD] = useState({ sol: 0, change: 0, mul: 1, updates: 0, tps: 0, uptime: "—" });

  useEffect(() => {
    const go = async () => {
      const [pr, st, an, nw] = await Promise.allSettled([
        fetch(`${API_BASE}/api/sol-price`).then(r => r.json()),
        fetch(`${API_BASE}/api/status`).then(r => r.json()),
        fetch(`${API_BASE}/api/current-analysis`).then(r => r.json()),
        fetch(`${API_BASE}/api/network-stats`).then(r => r.json()),
      ]);
      const sol = pr.status === "fulfilled" ? pr.value : {};
      const st_ = st.status === "fulfilled" ? st.value : {};
      const an_ = an.status === "fulfilled" ? an.value : {};
      const nw_ = nw.status === "fulfilled" ? nw.value : {};
      const ms = st_.uptimeMs ?? 0;
      const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4);
      setD({
        sol:     sol.usd ?? 0,
        change:  sol.usd_24h_change ?? 0,
        mul:     an_.multiplier ?? 1,
        updates: st_.totalUpdates ?? 0,
        tps:     nw_.tps ?? 0,
        uptime:  h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : "—",
      });
    };
    go(); const i = setInterval(go, 12_000); return () => clearInterval(i);
  }, []);

  const mColor = d.mul > 1.05 ? "var(--acid)" : d.mul < 0.95 ? "var(--red)" : "var(--t2)";
  const cPos   = d.change >= 0;

  const cardStyle = { padding: "18px 20px" };
  const labelStyle = { fontFamily: "var(--mono)" as const, fontSize: "11px", letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "var(--t3)", marginBottom: "10px", display: "block" as const };
  const subStyle   = { fontFamily: "var(--mono)" as const, fontSize: "12px" };

  return (
    <div role="region" aria-label="Key metrics"
      style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "20px" }}
      className="r2">

      {/* SOL/USD */}
      <div className="card accent-bar" style={cardStyle}>
        <span style={labelStyle}>SOL / USD</span>
        <p className="num-lg" style={{ color: "var(--t1)", marginBottom: "7px" }}>
          <span style={{ color: "var(--t3)", fontSize: "15px" }}>$</span>
          {d.sol > 0 ? <AnimNum to={d.sol} dec={2} /> : <span style={{ color: "var(--t3)" }}>—</span>}
        </p>
        <p style={{ ...subStyle, color: cPos ? "var(--acid)" : "var(--red)" }}>
          {cPos ? "▲" : "▼"} {Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(Math.abs(d.change))}%
          <span style={{ color: "var(--t3)", marginLeft: "4px" }}>24h</span>
        </p>
      </div>

      {/* Multiplier */}
      <div className="card" style={{ ...cardStyle, borderColor: `${mColor}30` }}>
        <span style={labelStyle}>AI Multiplier</span>
        <p className="num-lg" style={{ color: mColor, marginBottom: "7px" }}>
          <AnimNum to={d.mul} dec={2} /><span style={{ fontSize: "15px", opacity: 0.5 }}>×</span>
        </p>
        <p style={{ ...subStyle, color: "var(--t3)" }}>
          {d.mul > 1.05 ? "Demand rising" : d.mul < 0.95 ? "Demand falling" : "Stable market"}
        </p>
      </div>

      {/* Updates */}
      <div className="card" style={cardStyle}>
        <span style={labelStyle}>Chain Updates</span>
        <p className="num-lg" style={{ color: "var(--cyan)", marginBottom: "7px" }}>
          <AnimNum to={d.updates} dec={0} />
        </p>
        <p style={{ ...subStyle, color: "var(--t3)" }}>Uptime: {d.uptime}</p>
      </div>

      {/* TPS */}
      <div className="card" style={cardStyle}>
        <span style={labelStyle}>Solana TPS</span>
        <p className="num-lg" style={{ color: "var(--amber)", marginBottom: "7px" }}>
          {d.tps > 0 ? <AnimNum to={d.tps} dec={0} /> : <span style={{ color: "var(--t3)" }}>—</span>}
        </p>
        <p style={{ ...subStyle, color: "var(--t3)" }}>Devnet · Live</p>
      </div>
    </div>
  );
}
