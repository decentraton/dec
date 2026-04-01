"use client";

import { useEffect, useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AgentStatus {
  agent: string;
  wallet: string;
  totalUpdates: number;
  uptimeMs: number;
  programLoaded: boolean;
}

function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const prevRef = useRef("");

  useEffect(() => {
    if (text === prevRef.current) return;
    prevRef.current = text;
    setDisplayed("");
    let i = 0;
    const delay = Math.max(12, Math.min(30, 1500 / text.length));
    const tick = () => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
        setTimeout(tick, delay);
      }
    };
    tick();
  }, [text]);

  return (
    <span>
      {displayed}
      <span className="animate-pulse" style={{ color: "var(--neon-green)", opacity: displayed.length < text.length ? 1 : 0 }}>▌</span>
    </span>
  );
}

export function AiReasoning({ analysis, loading }: { analysis: any; loading: boolean }) {
  const [agentOnline, setAgentOnline] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status`);
        if (res.ok) {
          setAgentOnline(true);
          setAgentStatus(await res.json());
        } else {
          setAgentOnline(false);
        }
      } catch {
        setAgentOnline(false);
      }
    };
    check();
    const i = setInterval(check, 5000);
    return () => clearInterval(i);
  }, []);

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${s % 60}s`;
  };

  const multiplier = analysis?.multiplier ?? 1.0;
  const multiplierColor = multiplier > 1.05 ? "var(--neon-green)" : multiplier < 0.95 ? "var(--neon-red)" : "var(--text-primary)";

  return (
    <div className="anim-2">
      <div className="glass-card neon-top scanline p-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: "18px", color: "var(--text-primary)" }}>Oracle Status</h2>
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full pulse-dot"
              style={{ background: agentOnline ? "var(--neon-green)" : "var(--neon-red)", color: agentOnline ? "var(--neon-green)" : "var(--neon-red)" }}
            />
            <span className="mono text-[11px] font-bold uppercase tracking-widest" style={{ color: agentOnline ? "var(--neon-green)" : "var(--neon-red)" }}>
              {agentOnline ? "Gemini AI · Live" : "Agent Offline"}
            </span>
          </div>
        </div>

        {/* Stats row */}
        {agentStatus && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "Updates", val: agentStatus.totalUpdates.toString() },
              { label: "Uptime", val: formatUptime(agentStatus.uptimeMs) },
              { label: "Program", val: agentStatus.programLoaded ? "Loaded" : "—" },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: "var(--bg-raised)", border: "1px solid var(--bg-border)" }}>
                <div className="mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>{label}</div>
                <div className="mono text-xs font-bold" style={{ color: "var(--text-primary)" }}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Current Multiplier — large display */}
        <div className="rounded-xl p-4 mb-4 text-center" style={{ background: "var(--bg-void)", border: `1px solid ${multiplierColor}33` }}>
          <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-dim)" }}>Current Multiplier</div>
          <div className="font-bold" style={{ fontSize: "44px", color: multiplierColor, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {multiplier.toFixed(2)}×
          </div>
          {analysis?.confidence && (
            <div className="mono text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              AI Confidence: {analysis.confidence}%
            </div>
          )}
        </div>

        {/* Reasoning */}
        <div className="mb-4">
          <p className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-dim)" }}>AI Reasoning</p>
          <div className="rounded-lg p-3" style={{ background: "var(--bg-void)", border: "1px solid var(--bg-border)", minHeight: "72px" }}>
            <p style={{ fontSize: "12px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
              {loading ? (
                <span className="animate-pulse">Analyzing market data...</span>
              ) : (
                <TypingText text={analysis?.reasoning || "Waiting for signal..."} />
              )}
            </p>
          </div>
        </div>

        {/* Hash */}
        {analysis?.reasoningHash && (
          <div className="mb-4">
            <p className="mono text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>SHA-256 Reasoning Hash</p>
            <div className="mono rounded px-3 py-2 break-all" style={{ background: "var(--bg-void)", fontSize: "10px", color: "var(--neon-green)", border: "1px solid var(--bg-border)" }}>
              {analysis.reasoningHash.slice(0, 20)}...{analysis.reasoningHash.slice(-12)}
            </div>
          </div>
        )}

        {/* TX + timestamp footer */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--bg-border)" }}>
          <span className="mono text-[10px]" style={{ color: "var(--text-dim)" }}>
            {analysis?.timestamp ? new Date(analysis.timestamp).toLocaleTimeString() : "—"}
          </span>
          {analysis?.txSignature && (
            <a
              href={`https://explorer.solana.com/tx/${analysis.txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono text-[11px] transition-colors"
              style={{ color: "var(--neon-green)" }}
            >
              View TX ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
