"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { KpiBar } from "../components/kpi-bar";
import { GpuMarketplace } from "../components/gpu-marketplace";
import { AiReasoning } from "../components/ai-reasoning";
import { PriceChart } from "../components/price-chart";
import { DemoControls } from "../components/demo-controls";
import { MarketFeed } from "../components/market-feed";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);

  const fetchAnalysis = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/current-analysis`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        setAgentOnline(true);
        if (data.history && Array.isArray(data.history)) setHistory(data.history);
      } else setAgentOnline(false);
    } catch { setAgentOnline(false); }
  };

  useEffect(() => {
    fetchAnalysis();
    const i = setInterval(fetchAnalysis, 5000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--bg-border)",
        backdropFilter: "blur(16px)",
        background: "rgba(3,6,13,0.88)",
      }}>
        <div className="pg-wrap" style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
              background: "linear-gradient(135deg,#00ffb4,#00b4ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 18px rgba(0,255,180,0.35)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#000" />
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "15px", letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1 }}>
                DePIN AI Oracle
              </p>
              <p className="mono" style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                GPU Pricing Network
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: "4px" }}>
            {["Dashboard", "Docs", "GitHub"].map(n => (
              <a key={n}
                href={n === "GitHub" ? "https://github.com/decentraton/dec" : "#"}
                target={n === "GitHub" ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="mono"
                style={{
                  fontSize: "11px", padding: "5px 12px", borderRadius: "6px",
                  color: n === "Dashboard" ? "var(--neon-green)" : "var(--text-secondary)",
                  background: n === "Dashboard" ? "rgba(0,255,180,0.07)" : "transparent",
                  border: "none", cursor: "pointer", textDecoration: "none",
                  letterSpacing: "0.06em", textTransform: "uppercase", transition: "color .2s",
                }}>
                {n}
              </a>
            ))}
          </nav>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "6px", background: "var(--bg-card)", border: "1px solid var(--bg-border)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: agentOnline ? "var(--neon-green)" : "var(--neon-red)", display: "block" }} className={agentOnline ? "pulse-dot" : ""} />
              <span className="mono" style={{ fontSize: "10px", color: agentOnline ? "var(--neon-green)" : "var(--neon-red)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {agentOnline ? "Devnet · Live" : "Offline"}
              </span>
            </div>
            <WalletMultiButtonDynamic />
          </div>
        </div>
      </header>

      {/* ═══════════════ PAGE BODY ═══════════════ */}
      <main className="pg-wrap" style={{ paddingTop: "40px", paddingBottom: "80px" }}>

        {/* ── HERO ── */}
        <section className="anim-1" style={{ marginBottom: "40px" }}>
          <p className="mono" style={{ fontSize: "10px", color: "var(--neon-green)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "10px" }}>
            ▶&nbsp; Autonomous AI · Solana Devnet · Cryptographic Proofs
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "clamp(32px,5vw,60px)", letterSpacing: "-0.04em",
            lineHeight: 1, color: "var(--text-primary)",
          }}>
            Dynamic GPU Pricing{" "}
            <span style={{
              background: "linear-gradient(120deg,var(--neon-green),var(--neon-blue))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Powered by AI
            </span>
          </h1>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginTop: "14px", maxWidth: "520px", lineHeight: "1.65" }}>
            Gemini AI autonomously adjusts GPU rental prices every 60 s based on real market signals.
            Every decision is hashed on-chain via Solana.
          </p>
        </section>

        {/* ── KPI BAR ── */}
        <KpiBar />

        {/* ══════════════ MAIN 2-COL GRID ══════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", alignItems: "start" }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Chart – tall & prominent */}
            <div className="anim-2">
              <PriceChart history={history} />
            </div>

            {/* GPU Marketplace */}
            <div className="anim-3">
              <GpuMarketplace />
            </div>

          </div>

          {/* ── RIGHT STICKY SIDEBAR ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "76px" }}>
            <div className="anim-2"><AiReasoning analysis={analysis} loading={loading} /></div>
            <div className="anim-3">
              <DemoControls onUpdate={() => {
                setLoading(true);
                setTimeout(() => { fetchAnalysis(); setLoading(false); }, 1500);
              }} />
            </div>
          </div>

        </div>

        {/* ── FULL-WIDTH MARKET FEED ── */}
        <div style={{ marginTop: "20px" }} className="anim-4">
          <MarketFeed />
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--bg-border)", marginTop: "0" }}>
        <div className="pg-wrap" style={{ padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "5px", background: "linear-gradient(135deg,var(--neon-green),var(--neon-blue))", flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              DePIN AI Oracle · Solana Hackathon 2025
            </span>
          </div>
          <div className="mono" style={{ fontSize: "11px", display: "flex", gap: "20px", color: "var(--text-dim)" }}>
            <span>Program: <span style={{ color: "var(--text-secondary)" }}>36rS72Rg…ULPj</span></span>
            <a href="https://explorer.solana.com/address/36rS72Rgx7WesAjwv2cernhGDHBWXZuS3wpCTJVwULPj?cluster=devnet" target="_blank" rel="noopener noreferrer" style={{ color: "var(--neon-blue)", textDecoration: "none" }}>Explorer ↗</a>
            <a href="https://github.com/decentraton/dec" target="_blank" rel="noopener noreferrer" style={{ color: "var(--neon-green)", textDecoration: "none" }}>GitHub ↗</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
