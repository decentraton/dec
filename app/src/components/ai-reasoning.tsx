"use client";

import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function Cursor() {
  const [on, setOn] = useState(true);
  useEffect(() => { const i = setInterval(() => setOn(v => !v), 550); return () => clearInterval(i); }, []);
  return <span aria-hidden="true" style={{ opacity: on ? 1 : 0, color: "var(--acid)" }}>▌</span>;
}

function Typer({ text }: { text: string }) {
  const [s, setS] = useState("");
  const prev = useRef("");
  useEffect(() => {
    if (text === prev.current) return;
    prev.current = text; setS("");
    let i = 0;
    const delay = Math.max(8, Math.min(22, 900 / text.length));
    const tick = () => { if (i <= text.length) { setS(text.slice(0, i++)); setTimeout(tick, delay); } };
    tick();
  }, [text]);
  return <span>{s}<Cursor /></span>;
}

interface Status { totalUpdates: number; uptimeMs: number; programLoaded: boolean; }

export function AiReasoning({ analysis, loading }: { analysis: any; loading: boolean }) {
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const check = async () => {
      try { const r = await fetch(`${API_BASE}/api/status`); setOnline(r.ok); if (r.ok) setStatus(await r.json()); }
      catch { setOnline(false); }
    };
    check(); const i = setInterval(check, 5000); return () => clearInterval(i);
  }, []);

  const fmtUptime = (ms: number) => {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${s % 60}s`;
  };

  const mul = analysis?.multiplier ?? 1;
  const mc  = mul > 1.05 ? "var(--acid)" : mul < 0.95 ? "var(--red)" : "var(--t2)";

  return (
    <section aria-label="Oracle Status" className="card accent-bar scanline" style={{ padding: "22px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "15px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--t1)" }}>
          Oracle Status
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            className={`live-dot${!online ? " dot-offline" : ""}`}
            role="status"
            aria-label={online ? "Oracle online" : "Oracle offline"}
          />
          <span style={{ fontFamily: "var(--sans)", fontSize: "12px", fontWeight: 600, color: online ? "var(--acid)" : "var(--red)" }}>
            {online ? "Gemini · Live" : "Offline"}
          </span>
        </div>
      </div>

      {/* Hero multiplier */}
      <div style={{
        textAlign: "center", padding: "24px 16px 20px",
        borderRadius: "10px", background: "var(--void)",
        border: `1px solid ${mc}22`, marginBottom: "16px",
      }}>
        <p className="lbl" style={{ marginBottom: "10px", fontSize: "12px" }}>Current Multiplier</p>
        <p className="n-hero" style={{ color: mc }}>
          {mul.toFixed(2)}<span style={{ fontSize: "26px", opacity: 0.4 }}>×</span>
        </p>
        {analysis?.confidence !== undefined && (
          <p style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--t3)", marginTop: "10px" }}>
            Confidence: {analysis.confidence}%
          </p>
        )}
      </div>

      {/* Stats */}
      {status && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          {([
            { l: "Updates",  v: String(status.totalUpdates) },
            { l: "Uptime",   v: fmtUptime(status.uptimeMs) },
            { l: "Program",  v: status.programLoaded ? "OK" : "Err" },
          ] as const).map(({ l, v }) => (
            <div key={l} style={{
              background: "var(--raised)", border: "1px solid var(--border)",
              borderRadius: "8px", padding: "10px 12px", textAlign: "center",
            }}>
              <p className="lbl" style={{ marginBottom: "4px", fontSize: "11px" }}>{l}</p>
              <p style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 700, color: "var(--t1)", fontVariantNumeric: "tabular-nums" }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reasoning */}
      <div style={{ marginBottom: "14px" }}>
        <p className="lbl" style={{ marginBottom: "8px" }}>AI Reasoning</p>
        <div style={{
          background: "var(--void)", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "14px 16px", minHeight: "72px",
        }}>
          <p style={{ fontFamily: "var(--sans)", fontSize: "14px", lineHeight: "1.65", color: "var(--t2)", wordBreak: "break-word" }}>
            {loading
              ? <span style={{ color: "var(--t3)" }}>Analyzing…</span>
              : <Typer text={analysis?.reasoning ?? "Waiting for signal…"} />
            }
          </p>
        </div>
      </div>

      {/* Hash */}
      {analysis?.reasoningHash && (
        <div style={{ marginBottom: "14px" }}>
          <p className="lbl" style={{ marginBottom: "7px" }}>SHA-256 Proof</p>
          <p className="truncate" style={{
            fontFamily: "var(--mono)", fontSize: "11px", color: "var(--acid)",
            background: "var(--void)", border: "1px solid var(--border)",
            borderRadius: "7px", padding: "9px 14px",
          }}>
            {analysis.reasoningHash.slice(0, 20)}…{analysis.reasoningHash.slice(-10)}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
        <span style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)" }}>
          {analysis?.timestamp
            ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(analysis.timestamp))
            : "—"}
        </span>
        {analysis?.txSignature && (
          <a href={`https://explorer.solana.com/tx/${analysis.txSignature}?cluster=devnet`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "var(--sans)", fontSize: "12px", fontWeight: 600, color: "var(--acid)" }}
            aria-label="View transaction on Solana Explorer">
            View TX ↗
          </a>
        )}
      </div>
    </section>
  );
}
