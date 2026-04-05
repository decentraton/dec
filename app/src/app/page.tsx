"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { KpiBar }         from "../components/kpi-bar";
import { GpuMarketplace } from "../components/gpu-marketplace";
import { AiReasoning }    from "../components/ai-reasoning";
import { PriceChart }     from "../components/price-chart";
import { DemoControls }     from "../components/demo-controls";
import { EconomicImpact }  from "../components/economic-impact";

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
      setAnalysis(d); setAgentOnline(true);
      if (Array.isArray(d.history)) setHistory(d.history);
    } catch { setAgentOnline(false); }
  };

  useEffect(() => { poll(); const i = setInterval(poll, 5000); return () => clearInterval(i); }, []);

  return (
    <>
      {/* ═══ HEADER ═══════════════════════════════════════════════ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(20px) saturate(1.5)",
        background: "rgba(8,12,16,0.88)",
      }}>
        <div className="wrap" style={{ height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>

          {/* Logo */}
          <Link href="/" aria-label="DePIN AI Oracle — home"
            style={{ display: "flex", alignItems: "center", gap: "11px", flexShrink: 0 }}>
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="9" fill="var(--acid)" />
              <path d="M17 4L7 19h10l-1 9 11-14H17l1-10z" fill="#060e06" />
            </svg>
            <div>
              <p style={{ fontFamily: "var(--sans)", fontWeight: 800, fontSize: "15px", letterSpacing: "-0.03em", color: "var(--t1)", lineHeight: 1.1 }}>
                DePIN AI Oracle
              </p>
              <p style={{ fontFamily: "var(--sans)", fontSize: "11px", fontWeight: 400, color: "var(--t3)", marginTop: "1px" }}>
                GPU Pricing Network
              </p>
            </div>
          </Link>

          {/* Nav */}
          <nav aria-label="Primary navigation" style={{ display: "flex", gap: "2px", flex: 1, justifyContent: "center" }}>
            {([
              ["Dashboard",  "#"],
              ["Explorer",   `https://explorer.solana.com/address/HCvBL7SYEyHX82gLENzoD2DUSogqqyEcX3og3upBHSJ1?cluster=devnet`],
              ["GitHub",     "https://github.com/decentraton/dec"],
            ] as const).map(([label, href]) => (
              <a key={label} href={href}
                target={href.startsWith("http") ? "_blank" : "_self"}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{
                  fontFamily: "var(--sans)", fontSize: "13px", fontWeight: 500,
                  padding: "6px 14px", borderRadius: "7px",
                  color: label === "Dashboard" ? "var(--acid)" : "var(--t2)",
                  background: label === "Dashboard" ? "rgba(184,255,60,0.09)" : "transparent",
                  transition: "color 0.15s ease, background 0.15s ease",
                }}>
                {label}
              </a>
            ))}
          </nav>

          {/* Status + wallet */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div role="status" aria-live="polite" aria-label={agentOnline ? "Agent online" : "Agent offline"}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 12px", borderRadius: "7px", background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className={`live-dot${!agentOnline ? " dot-offline" : ""}`} aria-hidden="true" />
              <span style={{ fontFamily: "var(--sans)", fontSize: "12px", fontWeight: 600, color: agentOnline ? "var(--acid)" : "var(--red)" }}>
                {agentOnline ? "Live" : "Offline"}
              </span>
            </div>
            <WalletBtn />
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═════════════════════════════════════════════════ */}
      <main id="main-content" className="wrap" style={{ paddingTop: "52px", paddingBottom: "88px" }}>

        {/* HERO */}
        <section aria-label="Introduction" className="r1" style={{ marginBottom: "40px" }}>
          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "5px 12px 5px 8px", borderRadius: "100px",
            border: "1px solid rgba(184,255,60,0.22)",
            background: "rgba(184,255,60,0.06)", marginBottom: "20px",
          }}>
            <span className="live-dot" aria-hidden="true" />
            <span style={{ fontFamily: "var(--sans)", fontSize: "12px", fontWeight: 500, color: "var(--acid)" }}>
              Autonomous AI · Solana Devnet · Real-Time Pricing
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--sans)", fontWeight: 800,
            fontSize: "clamp(40px, 5.5vw, 68px)",
            letterSpacing: "-0.04em", lineHeight: 1.0,
            color: "var(--t1)", textWrap: "balance",
          }}>
            Dynamic GPU Pricing<br />
            <span style={{ color: "var(--acid)" }}>Powered by AI</span>
          </h1>

          <p style={{
            fontFamily: "var(--sans)", fontSize: "16px", fontWeight: 400,
            color: "var(--t2)", marginTop: "18px",
            maxWidth: "540px", lineHeight: "1.7",
          }}>
            Gemini AI autonomously adjusts GPU rental prices every 60 s based on real
            market signals. Every decision is SHA-256 hashed and recorded on Solana.
          </p>

          {/* Info pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "24px" }}>
            {[
              { l: "Program",  v: "HCvBL7…BHSJ1" },
              { l: "Network",  v: "Solana Devnet" },
              { l: "AI Model", v: "Gemini 2.5 Flash Lite" },
              { l: "Interval", v: "Every 60 s" },
            ].map(({ l, v }) => (
              <div key={l} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "5px 13px", borderRadius: "7px",
                background: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <span style={{ fontFamily: "var(--sans)", fontSize: "11px", fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--t1)" }}>{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* KPIs */}
        <KpiBar />

        {/* Economic Impact */}
        <EconomicImpact history={history} />

        {/* 2-COLUMN GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 356px", gap: "16px", alignItems: "start" }}>
          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="r3"><PriceChart history={history} /></div>
            <div className="r4"><GpuMarketplace /></div>
          </div>

          {/* Right sticky sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "74px" }}>
            <div className="r2"><AiReasoning analysis={analysis} loading={loading} /></div>
            <div className="r3">
              <DemoControls onUpdate={() => {
                setLoading(true);
                setTimeout(() => { poll(); setLoading(false); }, 1400);
              }} />
            </div>

            {/* On-chain info */}
            <div className="card r4" style={{ padding: "16px 18px" }}>
              {[
                { l: "Program ID", v: "HCvBL7…BHSJ1", href: "https://explorer.solana.com/address/HCvBL7SYEyHX82gLENzoD2DUSogqqyEcX3og3upBHSJ1?cluster=devnet" },
                { l: "Cluster",    v: "Devnet",        href: null },
                { l: "Framework",  v: "Anchor 0.30.1", href: null },
                { l: "Rust",       v: "1.75.0",        href: null },
              ].map(({ l, v, href }) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: "12px", fontWeight: 500, color: "var(--t3)" }}>{l}</span>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--acid)", fontWeight: 600 }}>
                      {v} ↗
                    </a>
                  ) : (
                    <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--t2)" }}>{v}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="wrap" style={{ padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="7" fill="rgba(184,255,60,0.12)" />
              <path d="M17 4L7 19h10l-1 9 11-14H17l1-10z" fill="var(--acid)" />
            </svg>
            <span style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--t3)" }}>
              DePIN AI Oracle · Solana Hackathon 2025
            </span>
          </div>
          <div style={{ display: "flex", gap: "20px" }}>
            {[
              { l: "Explorer", href: "https://explorer.solana.com/address/HCvBL7SYEyHX82gLENzoD2DUSogqqyEcX3og3upBHSJ1?cluster=devnet" },
              { l: "GitHub",   href: "https://github.com/decentraton/dec" },
            ].map(({ l, href }) => (
              <a key={l} href={href} target="_blank" rel="noopener noreferrer"
                aria-label={`Open ${l} in new tab`}
                style={{ fontFamily: "var(--sans)", fontSize: "13px", fontWeight: 500, color: "var(--t3)", transition: "color 0.15s ease" }}>
                {l} ↗
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
