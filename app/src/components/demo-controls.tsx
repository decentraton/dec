"use client";

import { useState, useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const EVENTS = [
  { key: "gpu_shortage", label: "GPU Shortage",    desc: "NVIDIA disruption · scarcity signal", dir: "↑", c: "var(--red)"   },
  { key: "bull_run",     label: "Bull Run",         desc: "BTC ATH · AI demand surge +40%",      dir: "↑", c: "var(--acid)"  },
  { key: "low_demand",   label: "Low Demand",       desc: "Market correction · compute −15%",    dir: "↓", c: "var(--cyan)"  },
] as const;

const INSTANT_PRESETS = [
  { key: "price_spike", label: "2.8×", desc: "Spike",  mul: 2.8, c: "#ff4444" },
  { key: "price_up",    label: "1.5×", desc: "+50%",   mul: 1.5, c: "var(--acid)" },
  { key: "price_reset", label: "1.0×", desc: "Reset",  mul: 1.0, c: "var(--t3)" },
  { key: "price_down",  label: "0.7×", desc: "−30%",   mul: 0.7, c: "var(--cyan)" },
  { key: "price_crash", label: "0.4×", desc: "Crash",  mul: 0.4, c: "#7b61ff" },
] as const;

const DEMO_SCENARIOS = [
  { key: "gpu_surge",      label: "GPU Surge",       mul: 2.2,  dir: "↑", c: "#ff4444",     desc: "H100 supply crunch · 2.2×"    },
  { key: "network_peak",   label: "Network Peak",    mul: 1.8,  dir: "↑", c: "var(--acid)", desc: "Solana congestion · 1.8×"     },
  { key: "depin_adoption", label: "DePIN Adoption",  mul: 1.6,  dir: "↑", c: "#00c896",     desc: "Infrastructure demand · 1.6×" },
  { key: "recovery",       label: "Recovery",        mul: 1.15, dir: "↗", c: "var(--cyan)", desc: "Post-correction settle · 1.15×"},
  { key: "bear_market",    label: "Bear Market",     mul: 0.55, dir: "↓", c: "#7b61ff",     desc: "Sustained downturn · 0.55×"   },
  { key: "flash_crash",    label: "Flash Crash",     mul: 0.3,  dir: "↓", c: "#ff4444",     desc: "Liquidity exit · 0.3×"        },
  { key: "compute_famine", label: "Compute Famine",  mul: 3.0,  dir: "⚡", c: "#ff6b00",    desc: "Critical shortage · 3.0× max" },
] as const;

const AUTO_INTERVAL_MS = 60_000; // 60s — must match server autonomous loop interval

export function DemoControls({ onUpdate }: { onUpdate: () => void }) {
  const [loading,   setLoading]   = useState<string | null>(null);
  const [last,      setLast]      = useState<{ event: string; mul: number; tx: string | null } | null>(null);
  const [autoOn,    setAutoOn]    = useState(false);
  const [countdown, setCountdown] = useState(AUTO_INTERVAL_MS / 1000);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const fire = async (key: string, url: string) => {
    setLoading(key); setLast(null);
    try {
      const r = await fetch(`${API_BASE}${url}`, { method: "POST" });
      const d = await r.json();
      if (r.ok && d.multiplier !== undefined) {
        setLast({ event: key, mul: d.multiplier, tx: d.txSignature });
        onUpdate();
      }
    } catch {}
    finally { setLoading(null); }
  };

  // Fetch initial toggle state from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(d => setAutoOn(!!d.isAutonomousEnabled))
      .catch(() => {});
  }, []);

  const handleToggle = async () => {
    const nextState = !autoOn;
    setAutoOn(nextState); // optimistic
    try {
      await fetch(`${API_BASE}/api/settings/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState })
      });
    } catch {
      setAutoOn(autoOn); // revert if fail
    }
  };

  // Fake countdown purely for visual effect when ON
  useEffect(() => {
    let int: ReturnType<typeof setInterval>;
    if (autoOn) {
      setCountdown(AUTO_INTERVAL_MS / 1000);
      int = setInterval(() => {
        setCountdown(c => (c <= 1 ? AUTO_INTERVAL_MS / 1000 : c - 1));
      }, 1000);
    } else {
      setCountdown(AUTO_INTERVAL_MS / 1000);
    }
    return () => clearInterval(int);
  }, [autoOn]);

  const Spinner = () => (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin 0.9s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="15"/>
    </svg>
  );

  return (
    <section aria-label="Market Simulator" className="card" style={{ padding: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--t1)" }}>
          Market Simulator
        </h2>
        <span className="tag tag-dim" style={{ fontSize: "10px" }}>Demo</span>
      </div>

      {/* ── Instant Price Override ── */}
      <div style={{ marginBottom: "12px" }}>
        <p style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          Instant Override · No AI
        </p>
        <div style={{ display: "flex", gap: "6px" }}>
          {INSTANT_PRESETS.map(p => {
            const isLoading = loading === `instant_${p.key}`;
            return (
              <button
                key={p.key}
                onClick={() => fire(`instant_${p.key}`, `/api/simulate-instant/${p.key}`)}
                disabled={loading !== null}
                aria-label={`Set price to ${p.label}`}
                style={{
                  flex: 1,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "9px 4px",
                  borderRadius: "8px",
                  border: `1px solid ${isLoading ? p.c + "88" : "var(--line)"}`,
                  background: isLoading ? `${p.c}18` : "var(--raised)",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading && !isLoading ? 0.4 : 1,
                  transition: "background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
                }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 800, color: isLoading ? p.c : "var(--t1)", lineHeight: 1.2 }}>{p.label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: p.c, marginTop: "3px" }}>{p.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <hr className="hairline" style={{ margin: "10px 0 12px" }} />

      {/* ── Demo Scenarios (no AI) ── */}
      <p style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
        Demo Scenarios · No AI
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "12px" }}>
        {DEMO_SCENARIOS.map(sc => {
          const isLoading = loading === `instant_${sc.key}`;
          return (
            <button
              key={sc.key}
              onClick={() => fire(`instant_${sc.key}`, `/api/simulate-instant/${sc.key}`)}
              disabled={loading !== null}
              aria-label={`Demo scenario: ${sc.label}`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${isLoading ? sc.c + "88" : "var(--line)"}`,
                background: isLoading ? `${sc.c}18` : "var(--raised)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading && !isLoading ? 0.4 : 1,
                transition: "background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
                textAlign: "left", width: "100%",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "14px", color: sc.c, lineHeight: 1, flexShrink: 0 }}>{sc.dir}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 700, color: isLoading ? sc.c : "var(--t1)", lineHeight: 1.2 }}>
                  {sc.label}
                </span>
                {isLoading && <Spinner />}
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)", lineHeight: 1.4 }}>{sc.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <hr className="hairline" style={{ margin: "10px 0 12px" }} />

      {/* Scenario buttons (AI) */}
      <p style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
        AI Scenarios · Gemini Analysis
      </p>
      {/* Scenario buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
        {EVENTS.map(ev => {
          const isLoading = loading === ev.key;
          return (
            <button key={ev.key}
              onClick={() => fire(ev.key, `/api/simulate/${ev.key}`)}
              disabled={loading !== null}
              aria-label={`Simulate ${ev.label}`}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "11px 14px", borderRadius: "8px",
                border: `1px solid ${isLoading ? ev.c + "55" : "var(--line)"}`,
                background: isLoading ? `${ev.c}0a` : "var(--raised)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading && !isLoading ? 0.4 : 1,
                transition: "background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
                textAlign: "left", width: "100%",
              }}>
              <span aria-hidden="true" style={{ fontFamily: "var(--mono)", fontSize: "18px", color: ev.c, width: "24px", textAlign: "center", flexShrink: 0, lineHeight: 1 }}>
                {ev.dir}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 700, color: isLoading ? ev.c : "var(--t1)", marginBottom: "2px" }}>{ev.label}</p>
                <p style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--t3)" }} className="truncate">{ev.desc}</p>
              </div>
              {isLoading && <Spinner />}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <hr className="hairline" style={{ margin: "12px 0" }} />

      {/* ── Auto Organic Toggle ── */}
      <div style={{
        borderRadius: "10px",
        border: `1px solid ${autoOn ? "rgba(184,255,60,0.35)" : "var(--line)"}`,
        background: autoOn ? "rgba(184,255,60,0.06)" : "var(--raised)",
        padding: "14px 16px",
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}>
        {/* Toggle row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: autoOn ? "10px" : "0" }}>
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 700, color: autoOn ? "var(--acid)" : "var(--t1)", marginBottom: "2px", transition: "color 0.2s ease" }}>
              🤖 Organic AI Update
            </p>
            <p style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--t3)" }}>
              {autoOn ? `Next update in ${countdown}s` : `Auto-update every ${AUTO_INTERVAL_MS / 1000} s`}
            </p>
          </div>

          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={autoOn}
            aria-label={autoOn ? "Disable automatic AI updates" : "Enable automatic AI updates"}
            onClick={handleToggle}
            style={{
              position: "relative",
              width: "48px", height: "26px", borderRadius: "13px",
              background: autoOn ? "var(--acid)" : "var(--raised)",
              border: `1px solid ${autoOn ? "var(--acid)" : "var(--line-hi)"}`,
              cursor: "pointer", flexShrink: 0,
              transition: "background 0.2s ease, border-color 0.2s ease",
            }}>
            {/* Thumb */}
            <span style={{
              position: "absolute",
              top: "3px",
              left: autoOn ? "25px" : "3px",
              width: "18px", height: "18px", borderRadius: "50%",
              background: autoOn ? "#000" : "var(--t2)",
              transition: "left 0.2s ease, background 0.2s ease",
              display: "block",
            }} />
          </button>
        </div>

        {/* Active state: progress bar countdown */}
        {autoOn && (
          <div style={{ marginTop: "4px" }}>
            <div style={{ height: "2px", background: "rgba(184,255,60,0.15)", borderRadius: "1px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(countdown / (AUTO_INTERVAL_MS / 1000)) * 100}%`,
                background: "var(--acid)",
                borderRadius: "1px",
                transition: "width 1s linear",
              }} />
            </div>
            {autoOn && countdown === 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                <Spinner />
                <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--acid)" }}>Agent querying Gemini...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Last result */}
      {last && (
        <div style={{ marginTop: "12px", padding: "11px 14px", background: "var(--void)", border: "1px solid rgba(184,255,60,0.18)", borderRadius: "8px" }}>
          <p className="label" style={{ marginBottom: "6px" }}>Last Result</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "var(--t1)" }}>
              Multiplier set to{" "}
              <span style={{ color: last.mul > 1 ? "var(--acid)" : "var(--red)", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                {last.mul.toFixed(2)}×
              </span>
            </p>
            {last.tx && (
              <a href={`https://explorer.solana.com/tx/${last.tx}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--acid)", letterSpacing: "0.06em" }}
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
