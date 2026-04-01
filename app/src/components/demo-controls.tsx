"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface DemoControlsProps {
  onUpdate: () => void;
}

const EVENTS = [
  {
    key: "gpu_shortage",
    label: "GPU Shortage",
    desc: "NVIDIA supply chain disruption",
    icon: "⚡",
    expectedDir: "up",
    color: "var(--neon-red)",
    bg: "rgba(255,71,87,0.06)",
  },
  {
    key: "bull_run",
    label: "Bull Run",
    desc: "Bitcoin AT H, AI tokens +40%",
    icon: "🚀",
    expectedDir: "up",
    color: "var(--neon-green)",
    bg: "rgba(0,255,180,0.06)",
  },
  {
    key: "low_demand",
    label: "Low Demand",
    desc: "Market correction, tech down 15%",
    icon: "↓",
    expectedDir: "down",
    color: "var(--neon-blue)",
    bg: "rgba(0,180,255,0.06)",
  },
];

export function DemoControls({ onUpdate }: DemoControlsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ event: string; multiplier: number; tx: string | null } | null>(null);

  const trigger = async (eventKey: string) => {
    setLoading(eventKey);
    setLastResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/simulate/${eventKey}`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.multiplier !== undefined) {
        setLastResult({ event: eventKey, multiplier: data.multiplier, tx: data.txSignature });
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const triggerOrganic = async () => {
    setLoading("organic");
    setLastResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/trigger-update`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.multiplier !== undefined) {
        setLastResult({ event: "organic", multiplier: data.multiplier, tx: data.txSignature });
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="glass-card p-5 anim-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontSize: "18px", color: "var(--text-primary)" }}>Market Simulator</h2>
          <p className="mono text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Trigger AI oracle updates manually</p>
        </div>
        <span className="badge badge-blue">DEMO</span>
      </div>

      {/* Scenario buttons */}
      <div className="space-y-2 mb-4">
        {EVENTS.map((ev) => {
          const isLoading = loading === ev.key;
          return (
            <button
              key={ev.key}
              onClick={() => trigger(ev.key)}
              disabled={loading !== null}
              className="w-full text-left rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-between"
              style={{
                background: isLoading ? ev.bg : "var(--bg-raised)",
                border: `1px solid ${isLoading ? ev.color : "var(--bg-border)"}`,
                cursor: loading !== null ? "not-allowed" : "pointer",
                opacity: loading !== null && !isLoading ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{ev.icon}</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: isLoading ? ev.color : "var(--text-primary)" }}>
                    {ev.label}
                  </div>
                  <div className="mono text-[10px]" style={{ color: "var(--text-secondary)" }}>{ev.desc}</div>
                </div>
              </div>
              {isLoading ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: ev.color }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
              ) : (
                <span className="mono text-xs" style={{ color: "var(--text-dim)" }}>
                  {ev.expectedDir === "up" ? "↑ price" : "↓ price"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Organic trigger */}
      <button
        onClick={triggerOrganic}
        disabled={loading !== null}
        className="w-full btn-secondary"
        style={{ justifyContent: "center" }}
      >
        {loading === "organic" ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            Analyzing...
          </>
        ) : (
          <>🤖 Organic AI Update</>
        )}
      </button>

      {/* Result */}
      {lastResult && (
        <div className="mt-4 rounded-xl p-3" style={{ background: "var(--bg-void)", border: "1px solid var(--neon-green)33" }}>
          <p className="mono text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-dim)" }}>Last Result</p>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
              Multiplier set to{" "}
              <strong style={{ color: lastResult.multiplier > 1 ? "var(--neon-green)" : "var(--neon-red)" }}>
                {lastResult.multiplier.toFixed(2)}×
              </strong>
            </span>
            {lastResult.tx && (
              <a
                href={`https://explorer.solana.com/tx/${lastResult.tx}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="mono text-[10px]"
                style={{ color: "var(--neon-green)" }}
              >
                TX ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
