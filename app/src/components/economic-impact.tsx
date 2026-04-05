"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function AnimNum({ to, dec = 1 }: { to: number; dec?: number }) {
  const [v, setV] = useState(to);
  const prev = useRef(to);
  useEffect(() => {
    if (Math.abs(to - prev.current) < 0.0001) return;
    const s = prev.current, dur = 800, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1), q = 1 - (1 - p) ** 3;
      setV(s + (to - s) * q);
      if (p < 1) requestAnimationFrame(tick); else prev.current = to;
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <>{v.toFixed(dec)}</>;
}

// Static base price multiplier = 1.0 (what providers would charge without AI)
const STATIC_MUL = 1.0;
const GPU_BASE_SOL = 0.5; // baseline SOL/hr for a standard GPU node

export function EconomicImpact({ history }: { history: any[] }) {
  const [solPrice, setSolPrice] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/sol-price`)
      .then(r => r.json())
      .then(d => { if (d.usd) setSolPrice(d.usd); })
      .catch(() => {});
  }, []);

  // Compute metrics from history
  const computed = (() => {
    if (!history || history.length < 2) return null;

    // Average AI multiplier across all history points
    const avgMul = history.reduce((sum, h) => sum + (h.multiplier ?? 1), 0) / history.length;

    // Revenue gain vs static pricing (AI captures more when demand is high, loses less when low)
    const aiRevenue     = history.reduce((s, h) => s + (h.multiplier ?? 1),  0);
    const staticRevenue = history.reduce((s, h) => s + STATIC_MUL,            0);
    const gainPct       = ((aiRevenue - staticRevenue) / staticRevenue) * 100;

    // Sessions above 1.0 = demand captured; below 1.0 = discount applied to fill nodes
    const bullSessions  = history.filter(h => (h.multiplier ?? 1) > 1.05).length;
    const bearSessions  = history.filter(h => (h.multiplier ?? 1) < 0.95).length;
    const utilRate      = (bullSessions / history.length) * 100;

    // Estimated cumulative extra SOL earned per node vs static over all recorded intervals
    // Each interval = 60s = 1/60 of an hour
    const intervals   = history.length;
    const hrFraction  = intervals / 60;
    const extraSolPerNode = (avgMul - STATIC_MUL) * GPU_BASE_SOL * hrFraction;
    const extraUsd        = extraSolPerNode * solPrice;

    return { gainPct, avgMul, bullSessions, bearSessions, utilRate, extraSolPerNode, extraUsd, intervals };
  })();

  if (!computed) return null;

  const gainPositive = computed.gainPct >= 0;
  const gainColor    = gainPositive ? "var(--acid)" : "var(--red)";

  return (
    <section aria-label="Economic Impact" style={{ marginBottom: "24px" }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: gainPositive ? "var(--acid)" : "var(--red)",
            boxShadow: `0 0 8px ${gainPositive ? "var(--acid)" : "var(--red)"}`,
          }} />
          <h2 style={{
            fontFamily: "var(--sans)", fontSize: "13px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--t2)",
          }}>
            Economic Impact
          </h2>
          <span style={{
            fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "5px", padding: "2px 8px",
          }}>
            AI vs Static 1.0× baseline · {computed.intervals} intervals sampled
          </span>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {/* Revenue Gain */}
        <div className="card" style={{
          padding: "18px 20px", position: "relative", overflow: "hidden",
          borderColor: `${gainColor}28`,
        }}>
          <div aria-hidden="true" style={{
            position: "absolute", top: 0, left: 0, bottom: 0, width: "3px",
            background: gainColor, opacity: 0.6, borderRadius: "12px 0 0 12px",
          }} />
          <p className="lbl" style={{ paddingLeft: "10px", marginBottom: "8px" }}>Revenue Gain</p>
          <p style={{
            fontFamily: "var(--mono)", fontSize: "28px", fontWeight: 800,
            color: gainColor, paddingLeft: "10px", lineHeight: 1, marginBottom: "6px",
          }}>
            {gainPositive ? "+" : ""}<AnimNum to={computed.gainPct} dec={1} />
            <span style={{ fontSize: "16px", opacity: 0.6 }}>%</span>
          </p>
          <p style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)", paddingLeft: "10px" }}>
            vs fixed price model
          </p>
        </div>

        {/* Extra SOL / node */}
        <div className="card" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
          <div aria-hidden="true" style={{
            position: "absolute", top: 0, left: 0, bottom: 0, width: "3px",
            background: "var(--cyan)", opacity: 0.5, borderRadius: "12px 0 0 12px",
          }} />
          <p className="lbl" style={{ paddingLeft: "10px", marginBottom: "8px" }}>Extra SOL / Node</p>
          <p style={{
            fontFamily: "var(--mono)", fontSize: "28px", fontWeight: 800,
            color: "var(--cyan)", paddingLeft: "10px", lineHeight: 1, marginBottom: "6px",
          }}>
            <AnimNum to={Math.max(0, computed.extraSolPerNode)} dec={3} />
            <span style={{ fontSize: "14px", opacity: 0.6, marginLeft: "4px" }}>SOL</span>
          </p>
          <p style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)", paddingLeft: "10px" }}>
            {solPrice > 0
              ? `≈ $${Math.max(0, computed.extraUsd).toFixed(2)} USD earned`
              : "accumulated vs baseline"}
          </p>
        </div>

        {/* Demand Capture Rate */}
        <div className="card" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
          <div aria-hidden="true" style={{
            position: "absolute", top: 0, left: 0, bottom: 0, width: "3px",
            background: "var(--amber)", opacity: 0.5, borderRadius: "12px 0 0 12px",
          }} />
          <p className="lbl" style={{ paddingLeft: "10px", marginBottom: "8px" }}>High-Demand Windows</p>
          <p style={{
            fontFamily: "var(--mono)", fontSize: "28px", fontWeight: 800,
            color: "var(--amber)", paddingLeft: "10px", lineHeight: 1, marginBottom: "6px",
          }}>
            <AnimNum to={computed.utilRate} dec={0} />
            <span style={{ fontSize: "16px", opacity: 0.6 }}>%</span>
          </p>
          <p style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)", paddingLeft: "10px" }}>
            {computed.bullSessions} bull / {computed.bearSessions} bear sessions
          </p>
        </div>

        {/* Avg AI Multiplier */}
        <div className="card" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
          <div aria-hidden="true" style={{
            position: "absolute", top: 0, left: 0, bottom: 0, width: "3px",
            background: "var(--acid)", opacity: 0.4, borderRadius: "12px 0 0 12px",
          }} />
          <p className="lbl" style={{ paddingLeft: "10px", marginBottom: "8px" }}>Avg AI Multiplier</p>
          <p style={{
            fontFamily: "var(--mono)", fontSize: "28px", fontWeight: 800,
            color: "var(--acid)", paddingLeft: "10px", lineHeight: 1, marginBottom: "6px",
          }}>
            <AnimNum to={computed.avgMul} dec={3} />
            <span style={{ fontSize: "16px", opacity: 0.5 }}>×</span>
          </p>
          <p style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)", paddingLeft: "10px" }}>
            Akash / io.net: fixed 1.0×
          </p>
        </div>
      </div>
    </section>
  );
}
