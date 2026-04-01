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
        if (data.history && Array.isArray(data.history)) {
          setHistory(data.history);
        }
      } else {
        setAgentOnline(false);
      }
    } catch {
      setAgentOnline(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    const interval = setInterval(fetchAnalysis, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <header style={{
        borderBottom: "1px solid var(--bg-border)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(3,6,13,0.85)",
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 32px" }}>
          <div className="flex items-center justify-between" style={{ height: "64px" }}>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div style={{
                width: "36px", height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, var(--neon-green), var(--neon-blue))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 16px rgba(0,255,180,0.3)",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#000" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                  DePIN AI Oracle
                </div>
                <div className="mono" style={{ fontSize: "10px", color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                  GPU PRICING NETWORK
                </div>
              </div>
            </div>

            {/* Center nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {["Dashboard", "Marketplace", "History", "Docs"].map((item) => (
                <button key={item} className="mono" style={{
                  fontSize: "12px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  color: item === "Dashboard" ? "var(--neon-green)" : "var(--text-secondary)",
                  background: item === "Dashboard" ? "rgba(0,255,180,0.06)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.2s",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}>
                  {item}
                </button>
              ))}
            </nav>

            {/* Right: status + wallet */}
            <div className="flex items-center gap-3">
              {/* Network indicator */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)" }}>
                <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: agentOnline ? "var(--neon-green)" : "var(--neon-red)", color: agentOnline ? "var(--neon-green)" : "var(--neon-red)" }} />
                <span className="mono text-[10px] uppercase tracking-wider" style={{ color: agentOnline ? "var(--neon-green)" : "var(--neon-red)" }}>
                  {agentOnline ? "Devnet" : "Offline"}
                </span>
              </div>
              <WalletMultiButtonDynamic />
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "40px 32px 0" }}>
        <div className="anim-1 mb-8" style={{ position: "relative" }}>
          <div className="mono text-xs uppercase tracking-widest mb-2" style={{ color: "var(--neon-green)" }}>
            ▶ Autonomous AI · Solana Devnet · Live Pricing
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--text-primary)", maxWidth: "640px" }}>
            Dynamic GPU Pricing{" "}
            <span style={{ background: "linear-gradient(135deg, var(--neon-green), var(--neon-blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Powered by AI
            </span>
          </h1>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginTop: "12px", maxWidth: "520px", lineHeight: "1.6" }}>
            Gemini AI autonomously adjusts GPU rental prices every 60 seconds based on real market signals.
            All decisions are cryptographically hashed and recorded on-chain.
          </p>
        </div>

        {/* ── KPI Bar ─────────────────────────────────────────── */}
        <KpiBar />

        {/* ── Main grid ───────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px", alignItems: "start" }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Chart */}
            <PriceChart history={history} />

            {/* GPU Marketplace */}
            <GpuMarketplace />

            {/* Event Feed */}
            <MarketFeed />
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <AiReasoning analysis={analysis} loading={loading} />
            <DemoControls onUpdate={() => {
              setLoading(true);
              setTimeout(() => {
                fetchAnalysis();
                setLoading(false);
              }, 1500);
            }} />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer style={{ marginTop: "64px", paddingTop: "24px", paddingBottom: "40px", borderTop: "1px solid var(--bg-border)" }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: "linear-gradient(135deg, var(--neon-green), var(--neon-blue))" }} />
              <span className="mono text-xs" style={{ color: "var(--text-secondary)" }}>DePIN AI Oracle · Solana Hackathon 2025</span>
            </div>
            <div className="mono text-xs flex gap-6" style={{ color: "var(--text-dim)" }}>
              <span>Program: <span style={{ color: "var(--text-secondary)" }}>36rS72Rg...ULPj</span></span>
              <a
                href="https://github.com/decentraton/dec"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--neon-green)", transition: "opacity 0.2s" }}
              >
                GitHub ↗
              </a>
              <a
                href="https://explorer.solana.com/address/36rS72Rgx7WesAjwv2cernhGDHBWXZuS3wpCTJVwULPj?cluster=devnet"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--neon-blue)", transition: "opacity 0.2s" }}
              >
                Explorer ↗
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
