"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TIER: Record<string, { c: string; l: string }> = {
  enterprise:   { c: "var(--acid)",   l: "Enterprise" },
  professional: { c: "var(--cyan)",   l: "Professional" },
  standard:     { c: "var(--amber)",  l: "Standard" },
};
const FLAG: Record<string, string> = {
  "us-east-1": "🇺🇸", "us-west-2": "🇺🇸",
  "eu-central-1": "🇩🇪", "ap-southeast-1": "🇸🇬",
};

interface Prov {
  id: string; name: string; model: string; count: number;
  location: string; locationCode: string;
  basePrice: number; currentPrice: number;
  vram: string; ram: string; storage: string;
  status: string; utilization: number; tier: string;
  multiplier: number; providerWallet?: string;
}

export function GpuMarketplace() {
  const [provs,     setProvs]     = useState<Prov[]>([]);
  const [mul,       setMul]       = useState(1);
  const [busy,      setBusy]      = useState<string | null>(null);
  const [filter,    setFilter]    = useState<"all" | "available">("all");
  const [gpuFilter, setGpuFilter] = useState<string>("all");
  const [lastRent,  setLastRent]  = useState<{ name: string; sig: string } | null>(null);

  const GPU_FILTER_OPTIONS = [
    { key: "all",    label: "All GPUs" },
    { key: "H100",   label: "H100" },
    { key: "A100",   label: "A100" },
    { key: "L40S",   label: "L40S" },
    { key: "4090",   label: "RTX 4090" },
  ] as const;
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const go = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/providers`);
        if (r.ok) { const d = await r.json(); setProvs(d.providers ?? []); setMul(d.multiplier ?? 1); }
      } catch {}
    };
    go(); const i = setInterval(go, 10_000); return () => clearInterval(i);
  }, []);

  const rent = async (p: Prov) => {
    if (!publicKey || !connected) { alert("Connect your Phantom or Solflare wallet first."); return; }
    setBusy(p.id);
    try {
      const lamports = Math.round(p.currentPrice * 1e9);
      const tx = new Transaction().add(SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(p.providerWallet || publicKey.toBase58()),
        lamports,
      }));
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setLastRent({ name: p.name, sig });
      // Auto-hide after 10 seconds
      setTimeout(() => setLastRent(null), 10000);
    } catch (e: any) {
      if (!e.message?.includes("rejected")) alert(`Transaction failed — ${e.message}`);
    } finally { setBusy(null); }
  };

  const byAvail = filter === "available" ? provs.filter(p => p.status === "available") : provs;
  const list    = gpuFilter === "all" ? byAvail : byAvail.filter(p => p.model.includes(gpuFilter));
  const avail   = provs.filter(p => p.status === "available").length;

  return (
    <section aria-label="GPU Marketplace">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--t1)", marginBottom: "4px" }}>
            GPU Marketplace
          </h2>
          <p style={{ fontFamily: "var(--sans)", fontSize: "14px", color: "var(--t3)" }}>
            <span style={{ color: "var(--acid)", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{avail}</span>
            <span style={{ margin: "0 4px" }}>/</span>
            {provs.length} nodes available · multiplier{" "}
            <span style={{
              color: mul > 1.05 ? "var(--acid)" : mul < 0.95 ? "var(--red)" : "var(--t2)",
              fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums",
            }}>{mul.toFixed(2)}×</span>
          </p>
        </div>
        <div role="tablist" aria-label="Filter by availability" style={{ display: "flex", gap: "5px" }}>
          {(["all", "available"] as const).map(f => (
            <button key={f} role="tab" aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? "btn-acid" : "btn-dim"}`}
              style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}>
              {f === "all" ? "All Nodes" : "Available"}
            </button>
          ))}
        </div>
      </div>

      {/* GPU model filter */}
      <div role="tablist" aria-label="Filter by GPU model" style={{ display: "flex", gap: "5px", marginBottom: "16px", flexWrap: "wrap" }}>
        {GPU_FILTER_OPTIONS.map(opt => (
          <button key={opt.key} role="tab" aria-selected={gpuFilter === opt.key}
            onClick={() => setGpuFilter(opt.key)}
            style={{
              fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700,
              padding: "5px 12px", borderRadius: "6px", cursor: "pointer",
              border: gpuFilter === opt.key ? "1px solid var(--acid)" : "1px solid var(--border)",
              background: gpuFilter === opt.key ? "rgba(184,255,60,0.1)" : "var(--raised)",
              color: gpuFilter === opt.key ? "var(--acid)" : "var(--t3)",
              transition: "all 0.15s ease",
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px" }}>
        {list.map(p => {
          const t    = TIER[p.tier] || TIER.standard;
          const off  = p.status === "busy";
          const util = p.utilization;
          const uCol = util > 75 ? "var(--red)" : util > 50 ? "var(--amber)" : "var(--acid)";

          return (
            <article key={p.id} className="card" style={{
              padding: "18px 20px",
              opacity: off ? 0.65 : 1,
              borderColor: off ? "var(--border)" : `${t.c}28`,
            }}>
              {/* top accent */}
              <div aria-hidden="true" style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                background: t.c, opacity: 0.65, borderRadius: "12px 12px 0 0",
              }} />

              {/* Status + tier */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span aria-hidden="true" style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: off ? "var(--red)" : "var(--acid)",
                    display: "block", flexShrink: 0,
                  }} className={off ? "" : "live-dot"} />
                  <span style={{ fontFamily: "var(--sans)", fontSize: "12px", fontWeight: 600, color: off ? "var(--red)" : "var(--acid)" }}>
                    {off ? "Busy" : "Available"}
                  </span>
                </div>
                <span className="tag" style={{
                  background: `${t.c}12`, color: t.c,
                  border: `1px solid ${t.c}28`,
                }}>
                  {t.l}
                </span>
              </div>

              {/* Name + location */}
              <h3 style={{ fontFamily: "var(--sans)", fontSize: "15px", fontWeight: 700, color: "var(--t1)", marginBottom: "3px", letterSpacing: "-0.01em" }}>
                {p.name}
              </h3>
              <p style={{ fontFamily: "var(--sans)", fontSize: "13px", color: "var(--t3)", marginBottom: "14px" }} className="truncate min-w-0">
                {FLAG[p.locationCode] ?? "🌐"} {p.location} · {p.count}× {p.model}
              </p>

              {/* Specs */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                {([["VRAM", p.vram], ["RAM", p.ram], ["SSD", p.storage]] as const).map(([l, v]) => (
                  <div key={l} style={{
                    flex: 1, background: "var(--raised)",
                    border: "1px solid var(--border)", borderRadius: "7px",
                    padding: "7px 10px", textAlign: "center", minWidth: 0,
                  }}>
                    <p style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 700, color: "var(--t1)", marginBottom: "2px" }} className="truncate">{v}</p>
                    <p className="lbl" style={{ fontSize: "10px" }}>{l}</p>
                  </div>
                ))}
              </div>

              {/* Utilization */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)", fontWeight: 500 }}>Utilization</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: uCol, fontVariantNumeric: "tabular-nums" }}>{util.toFixed(0)}%</span>
                </div>
                <div role="progressbar" aria-valuenow={util} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`${p.name} utilization ${util.toFixed(0)}%`}
                  style={{ height: "4px", background: "var(--raised)", borderRadius: "2px" }}>
                  <div style={{ height: "100%", borderRadius: "2px", width: `${util}%`, background: uCol, transition: "width 1.2s ease" }} />
                </div>
              </div>

              {/* Price + CTA */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "10px" }}>
                <div className="min-w-0">
                  <p style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)", textDecoration: "line-through", marginBottom: "3px", fontVariantNumeric: "tabular-nums" }}>
                    {p.basePrice.toFixed(2)} SOL base
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em",
                      color: mul > 1.05 ? "var(--acid)" : mul < 0.95 ? "var(--red)" : "var(--t1)",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {p.currentPrice.toFixed(4)}
                    </span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)" }}>SOL/hr</span>
                  </div>
                </div>
                <button onClick={() => rent(p)} disabled={!!busy || off}
                  className="btn btn-acid"
                  aria-label={`Rent ${p.name} for ${p.currentPrice.toFixed(4)} SOL per hour`}
                  style={{ flexShrink: 0 }}>
                  {busy === p.id ? "Signing…" : off ? "Busy" : "Rent Now →"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Success Notification Bar ── */}
      {lastRent && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          zIndex: 100, width: "100%", maxWidth: "480px", padding: "0 20px",
          animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}>
          <style>{`
            @keyframes slideUp {
              from { transform: translate(-50%, 40px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          
          <div className="card" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px", background: "rgba(8,12,16,0.95)",
            border: "1px solid var(--acid)", boxShadow: "0 8px 32px rgba(184,255,60,0.15)",
            borderRadius: "12px", backdropFilter: "blur(12px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(184,255,60,0.15)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--acid)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: "var(--sans)", fontSize: "13px", fontWeight: 700, color: "var(--t1)", marginBottom: "1px" }}>
                  Successfully Rented!
                </p>
                <p style={{ fontFamily: "var(--sans)", fontSize: "12px", color: "var(--t3)" }} className="truncate">
                  {lastRent.name}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <a href={`https://explorer.solana.com/tx/${lastRent.sig}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--sans)", fontSize: "12px", fontWeight: 600,
                  color: "var(--acid)", textDecoration: "none", whiteSpace: "nowrap",
                  padding: "6px 12px", borderRadius: "6px", background: "rgba(184,255,60,0.08)",
                  border: "1px solid rgba(184,255,60,0.2)", transition: "all 0.2s ease"
                }}>
                View TX ↗
              </a>
              <button 
                onClick={() => setLastRent(null)}
                style={{
                  background: "none", border: "none", color: "var(--t3)",
                  cursor: "pointer", padding: "4px", display: "flex", alignItems: "center"
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
