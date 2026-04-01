"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { KpiBar }          from "../components/kpi-bar";
import { GpuMarketplace }  from "../components/gpu-marketplace";
import { AiReasoning }     from "../components/ai-reasoning";
import { PriceChart }      from "../components/price-chart";
import { DemoControls }    from "../components/demo-controls";

const WalletBtn = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [analysis,    setAnalysis]    = useState<any>(null);
  const [history,     setHistory]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);

  const poll = async () => {
    try {
      const r = await fetch(`${API}/api/current-analysis`);
      if (!r.ok) { setAgentOnline(false); return; }
      const d = await r.json();
      setAnalysis(d);
      setAgentOnline(true);
      if (Array.isArray(d.history)) setHistory(d.history);
    } catch { setAgentOnline(false); }
  };

  useEffect(() => { poll(); const i = setInterval(poll, 5000); return () => clearInterval(i); }, []);

  return (
    <>
      {/* ═══ HEADER ═══════════════════════════════════════════ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--line)",
        backdropFilter: "blur(18px) saturate(1.6)",
        background: "rgba(8,12,16,0.85)",
      }}>
        <div className="wrap" style={{ height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>

          {/* Logo */}
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, textDecoration: "none" }}
            aria-label="DePIN AI Oracle — home">
            <svg aria-hidden="true" width="30" height="30" viewBox="0 0 30 30" fill="none">
              <rect width="30" height="30" rx="8" fill="#b8ff3c" />
              <path d="M16 5L6 18h9l-1 7 10-13h-9l1-7z" fill="#080c10" />
            </svg>
            <div>
              <p style={{ fontFamily: "var(--sans)", fontWeight: 800, fontSize: "14px", letterSpacing: "-0.02em", color: "var(--t1)", lineHeight: 1.1 }}>
                DePIN AI Oracle
              </p>
              <p style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--t3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                GPU Pricing Network
              </p>
            </div>
          </a>

          {/* Nav */}
          <nav aria-label="Primary navigation" style={{ display: "flex", gap: "2px", flex: 1, justifyContent: "center" }}>
            {([ ["Dashboard", "#"],
                ["Explorer", `https://explorer.solana.com/address/36rS72Rgx7WesAjwv2cernhGDHBWXZuS3wpCTJVwULPj?cluster=devnet`],
                ["GitHub",   "https://github.com/decentraton/dec"] ] as const).map(([label, href]) => (
              <a key={label} href={href}
                target={href.startsWith("http") ? "_blank" : "_self"}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{
                  fontFamily: "var(--mono)", textTransform: "uppercase",
                  letterSpacing: "0.08em", padding: "5px 12px", borderRadius: "5px",
                  color: label === "Dashboard" ? "var(--acid)" : "var(--t3)",
                  background: label === "Dashboard" ? "rgba(184,255,60,0.08)" : "transparent",
                  transition: "color 0.15s ease",
                  textDecoration: "none", fontSize: "12px",
                }}>
                {label}
              </a>
            ))}
          </nav>

          {/* Status + wallet */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <div role="status" aria-live="polite" aria-label={agentOnline ? "Agent online" : "Agent offline"}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "5px", background: "var(--surface)", border: "1px solid var(--line)" }}>
              <span className={`live-dot${!agentOnline ? " dot-offline" : ""}`} aria-hidden="true" />
              <span style={{ fontFamily: "var(--mono)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: agentOnline ? "var(--acid)" : "var(--red)" }}>
                {agentOnline ? "Live" : "Offline"}
              </span>
            </div>
            <WalletBtn />
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═════════════════════════════════════════════ */}
      <main id="main-content" className="wrap" style={{ paddingTop: "48px", paddingBottom: "80px" }}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <section aria-label="Introduction" className="r1" style={{ marginBottom: "36px" }}>
          {/* Eyebrow ticker */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 10px 4px 6px", borderRadius: "20px", border: "1px solid rgba(184,255,60,0.2)", background: "rgba(184,255,60,0.05)", marginBottom: "16px" }}>
            <span className="live-dot" aria-hidden="true" />
            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--acid)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Autonomous AI · Solana Devnet · Real-Time
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--sans)", fontWeight: 800,
            fontSize: "clamp(36px, 5vw, 64px)",
            letterSpacing: "-0.04em", lineHeight: 1.0,
            color: "var(--t1)",
            textWrap: "balance",
          }}>
            Dynamic GPU Pricing<br />
            <span style={{ color: "var(--acid)" }}>Powered by AI</span>
          </h1>

          <p style={{
            fontFamily: "var(--mono)", fontSize: "14px",
            color: "var(--t2)", marginTop: "16px",
            maxWidth: "520px", lineHeight: "1.7",
          }}>
            Gemini AI autonomously adjusts GPU rental prices every 60 s based on real
            market signals. Every decision is SHA-256 hashed and recorded on Solana.
          </p>

          {/* Stat pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "20px" }}>
            {[
              { l: "Program",  v: "36rS72…ULPj" },
              { l: "Network",  v: "Solana Devnet" },
              { l: "AI Model", v: "Gemini 1.5 Flash" },
              { l: "Interval", v: "Every 60 s" },
            ].map(({ l, v }) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 11px", borderRadius: "5px", background: "var(--surface)", border: "1px solid var(--line)" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{l}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--t1)" }}>{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── KPIs ─────────────────────────────────────────── */}
        <KpiBar />

        {/* ── TWO-COLUMN GRID ──────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px", alignItems: "start" }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="r3"><PriceChart history={history} /></div>
            <div className="r4"><GpuMarketplace /></div>
          </div>

          {/* RIGHT — sticky sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "72px" }}>
            <div className="r2"><AiReasoning analysis={analysis} loading={loading} /></div>
            <div className="r3">
              <DemoControls onUpdate={() => {
                setLoading(true);
                setTimeout(() => { poll(); setLoading(false); }, 1400);
              }} />
            </div>

            {/* On-chain info box */}
            <div className="card r4" style={{ padding: "14px 16px" }}>
              <p className="label" style={{ marginBottom: "10px" }}>On-Chain Info</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { l: "Program ID",  v: "36rS72…ULPj", href: "https://explorer.solana.com/address/36rS72Rgx7WesAjwv2cernhGDHBWXZuS3wpCTJVwULPj?cluster=devnet" },
                  { l: "Cluster",     v: "Devnet", href: null },
                  { l: "Framework",   v: "Anchor 0.30.1", href: null },
                  { l: "Rust",        v: "1.75.0 (strict)", href: null },
                ].map(({ l, v, href }) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                    <span className="label" style={{ fontSize: "8px" }}>{l}</span>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--acid)", textDecoration: "none" }}>
                        {v} ↗
                      </a>
                    ) : (
                      <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t2)" }}>{v}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ═══ FOOTER ═══════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid var(--line)", marginTop: "0" }}>
        <div className="wrap" style={{ padding: "18px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 30 30" fill="none">
              <rect width="30" height="30" rx="6" fill="rgba(184,255,60,0.15)" />
              <path d="M16 5L6 18h9l-1 7 10-13h-9l1-7z" fill="var(--acid)" />
            </svg>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)" }}>
              DePIN AI Oracle · Solana Hackathon 2025
            </span>
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { l: "Explorer", href: "https://explorer.solana.com/address/36rS72Rgx7WesAjwv2cernhGDHBWXZuS3wpCTJVwULPj?cluster=devnet" },
              { l: "GitHub",   href: "https://github.com/decentraton/dec" },
            ].map(({ l, href }) => (
              <a key={l} href={href} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)", letterSpacing: "0.06em", transition: "color 0.15s ease", textDecoration: "none" }}
                aria-label={`Open ${l} in new tab`}>
                {l} ↗
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
