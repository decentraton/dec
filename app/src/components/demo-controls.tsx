"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const EVENTS = [
  { key: "gpu_shortage", label: "GPU Shortage", desc: "NVIDIA supply disruption · scarcity signal", dir: "↑", c: "var(--red)" },
  { key: "bull_run",     label: "Bull Run",     desc: "BTC ATH · AI demand surge +40%",          dir: "↑", c: "var(--acid)" },
  { key: "low_demand",   label: "Low Demand",   desc: "Market correction · compute down 15%",     dir: "↓", c: "var(--cyan)" },
] as const;

export function DemoControls({ onUpdate }: { onUpdate: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [last, setLast]       = useState<{ event: string; mul: number; tx: string | null } | null>(null);

  const fire = async (key: string, url: string, method = "POST") => {
    setLoading(key); setLast(null);
    try {
      const r = await fetch(`${API_BASE}${url}`, { method });
      const d = await r.json();
      if (r.ok && d.multiplier !== undefined) { setLast({ event: key, mul: d.multiplier, tx: d.txSignature }); onUpdate(); }
    } catch {}
    finally { setLoading(null); }
  };

  const Spinner = () => (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="15" />
    </svg>
  );

  return (
    <section aria-label="Market Simulator" className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--t1)" }}>
          Market Simulator
        </h2>
        <span className="tag tag-dim">Demo</span>
      </div>

      {/* Scenario list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
        {EVENTS.map(ev => {
          const isLoading = loading === ev.key;
          return (
            <button
              key={ev.key}
              onClick={() => fire(ev.key, `/api/simulate/${ev.key}`)}
              disabled={loading !== null}
              aria-label={`Simulate ${ev.label}`}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", borderRadius: "7px", border: `1px solid ${isLoading ? ev.c + "44" : "var(--line)"}`,
                background: isLoading ? `${ev.c}08` : "var(--raised)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading && !isLoading ? 0.45 : 1,
                transition: "background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
                textAlign: "left", width: "100%",
              }}
            >
              {/* Dir indicator */}
              <span style={{ fontFamily: "var(--mono)", fontSize: "16px", color: ev.c, width: "22px", textAlign: "center", flexShrink: 0, lineHeight: 1 }}
                aria-hidden="true">
                {ev.dir}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700, color: isLoading ? ev.c : "var(--t1)", marginBottom: "1px" }}>{ev.label}</p>
                <p style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--t3)" }} className="truncate">{ev.desc}</p>
              </div>
              {isLoading && <Spinner />}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <hr className="hairline" style={{ margin: "10px 0" }} />

      {/* Organic AI trigger */}
      <button
        onClick={() => fire("organic", "/api/trigger-update")}
        disabled={loading !== null}
        className="btn btn-ghost"
        aria-label="Trigger organic AI market update"
        style={{ width: "100%", height: "36px" }}
      >
        {loading === "organic" ? <><Spinner /> Analyzing…</> : "🤖 Organic AI Update"}
      </button>

      {/* Last result */}
      {last && (
        <div style={{ marginTop: "10px", padding: "10px 12px", background: "var(--void)", border: "1px solid rgba(184,255,60,0.15)", borderRadius: "7px" }}>
          <p className="label" style={{ marginBottom: "5px" }}>Result</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--t1)" }}>
              Multiplier → <span style={{ color: last.mul > 1 ? "var(--acid)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>{last.mul.toFixed(2)}×</span>
            </p>
            {last.tx && (
              <a href={`https://explorer.solana.com/tx/${last.tx}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--acid)", letterSpacing: "0.08em" }}
                aria-label="View result transaction on Solana Explorer">
                TX ↗
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
