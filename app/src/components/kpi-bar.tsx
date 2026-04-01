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

  const item = (
    accentColor: string,
    label: string,
    value: React.ReactNode,
    sub: React.ReactNode,
    isAccent?: boolean
  ) => (
    <div className={`card${isAccent ? " accent-bar" : ""}`}
      style={{ padding: "20px 22px", borderColor: isAccent ? `${accentColor}28` : undefined }}>
      {/* Colored left stripe */}
      <div aria-hidden="true" style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: "3px",
        background: accentColor, opacity: 0.5, borderRadius: "12px 0 0 12px",
      }} />
      <p className="lbl" style={{ paddingLeft: "10px", marginBottom: "10px" }}>{label}</p>
      <p className="n-xl" style={{ color: accentColor, paddingLeft: "10px", marginBottom: "6px", lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--t2)", paddingLeft: "10px" }}>
        {sub}
      </p>
    </div>
  );

  return (
    <div role="region" aria-label="Key metrics"
      style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "24px" }}
      className="r2">
      {item(
        "var(--cyan)", "SOL / USD",
        d.sol > 0 ? <><span style={{ fontSize: "16px", opacity: 0.6 }}>$</span><AnimNum to={d.sol} dec={2} /></> : <span style={{ color: "var(--t3)" }}>—</span>,
        <span style={{ color: cPos ? "var(--acid)" : "var(--red)" }}>
          {cPos ? "▲" : "▼"} {Math.abs(d.change).toFixed(2)}%
          <span style={{ color: "var(--t3)", marginLeft: "6px" }}>24h</span>
        </span>
      )}
      {item(
        mColor, "AI Multiplier",
        <><AnimNum to={d.mul} dec={2} /><span style={{ fontSize: "16px", opacity: 0.5 }}>×</span></>,
        d.mul > 1.05 ? "Demand rising" : d.mul < 0.95 ? "Demand falling" : "Stable market"
      )}
      {item(
        "var(--acid)", "Chain Updates",
        <AnimNum to={d.updates} dec={0} />,
        `Uptime: ${d.uptime}`,
        true
      )}
      {item(
        "var(--amber)", "Solana TPS",
        d.tps > 0 ? <AnimNum to={d.tps} dec={0} /> : <span style={{ color: "var(--t3)" }}>—</span>,
        "Devnet · Live"
      )}
    </div>
  );
}
