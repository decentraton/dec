"use client";

import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AS { agent: string; wallet: string; totalUpdates: number; uptimeMs: number; programLoaded: boolean; }

function Cursor() {
  const [on, setOn] = useState(true);
  useEffect(() => { const i = setInterval(() => setOn(v => !v), 530); return () => clearInterval(i); }, []);
  return <span style={{ opacity: on ? 1 : 0, color: "var(--neon-green)" }}>▌</span>;
}

function TypingText({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  const prev = useRef("");
  useEffect(() => {
    if (text === prev.current) return;
    prev.current = text;
    setShown("");
    let i = 0;
    const delay = Math.max(10, Math.min(28, 1200 / text.length));
    const t = () => { if (i <= text.length) { setShown(text.slice(0, i++)); setTimeout(t, delay); } };
    t();
  }, [text]);
  return <span>{shown}<Cursor /></span>;
}

export function AiReasoning({ analysis, loading }: { analysis: any; loading: boolean }) {
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState<AS | null>(null);

  useEffect(() => {
    const check = async () => {
      try { const r = await fetch(`${API_BASE}/api/status`); if (r.ok) { setOnline(true); setStatus(await r.json()); } else setOnline(false); }
      catch { setOnline(false); }
    };
    check();
    const i = setInterval(check, 5000);
    return () => clearInterval(i);
  }, []);

  const fmt = (ms: number) => { const s = Math.floor(ms / 1e3), m = Math.floor(s / 60), h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${s % 60}s`; };
  const mul = analysis?.multiplier ?? 1;
  const mc = mul > 1.05 ? "var(--neon-green)" : mul < 0.95 ? "var(--neon-red)" : "var(--text-primary)";

  return (
    <div className="glass-card neon-top scanline" style={{ padding: "22px" }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Oracle Status</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className={online ? "pulse-dot" : ""}
            style={{ width: "7px", height: "7px", borderRadius: "50%", background: online ? "var(--neon-green)" : "var(--neon-red)", display: "block", color: online ? "var(--neon-green)" : "var(--neon-red)" }}
          />
          <span className="mono" style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: online ? "var(--neon-green)" : "var(--neon-red)" }}>
            {online ? "Gemini · Live" : "Offline"}
          </span>
        </div>
      </div>

      {/* Multiplier hero */}
      <div style={{ textAlign: "center", padding: "20px 0 16px", borderRadius: "10px", background: "var(--bg-void)", border: `1px solid ${mc}28`, marginBottom: "16px" }}>
        <p className="section-label" style={{ marginBottom: "6px", textAlign: "center" }}>Current Multiplier</p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "52px", fontWeight: 700, color: mc, letterSpacing: "-0.04em", lineHeight: 1 }}>
          {mul.toFixed(2)}×
        </p>
        {analysis?.confidence !== undefined && (
          <p className="mono" style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "8px" }}>
            Confidence: {analysis.confidence}%
          </p>
        )}
      </div>

      {/* Stats mini grid */}
      {status && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          {[
            { l: "Updates", v: status.totalUpdates },
            { l: "Uptime",  v: fmt(status.uptimeMs) },
            { l: "Program", v: status.programLoaded ? "OK" : "—" },
          ].map(({ l, v }) => (
            <div key={l} style={{ background: "var(--bg-raised)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
              <p className="section-label" style={{ marginBottom: "3px", fontSize: "9px" }}>{l}</p>
              <p className="mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reasoning */}
      <div style={{ marginBottom: "14px" }}>
        <p className="section-label">AI Reasoning</p>
        <div style={{ background: "var(--bg-void)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "12px 14px", minHeight: "64px" }}>
          <p style={{ fontSize: "12px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
            {loading
              ? <span style={{ color: "var(--text-dim)" }}>Analyzing…</span>
              : <TypingText text={analysis?.reasoning || "Waiting for signal…"} />
            }
          </p>
        </div>
      </div>

      {/* Hash */}
      {analysis?.reasoningHash && (
        <div style={{ marginBottom: "14px" }}>
          <p className="section-label">SHA-256 Hash</p>
          <p className="mono" style={{
            fontSize: "10px", color: "var(--neon-green)",
            background: "var(--bg-void)", border: "1px solid var(--bg-border)",
            borderRadius: "6px", padding: "8px 12px", wordBreak: "break-all",
          }}>
            {analysis.reasoningHash.slice(0, 24)}…{analysis.reasoningHash.slice(-10)}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--bg-border)" }}>
        <span className="mono" style={{ fontSize: "10px", color: "var(--text-dim)" }}>
          {analysis?.timestamp ? new Date(analysis.timestamp).toLocaleTimeString() : "—"}
        </span>
        {analysis?.txSignature && (
          <a href={`https://explorer.solana.com/tx/${analysis.txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
            className="mono" style={{ fontSize: "10px", color: "var(--neon-green)", textDecoration: "none" }}>
            View TX ↗
          </a>
        )}
      </div>
    </div>
  );
}
