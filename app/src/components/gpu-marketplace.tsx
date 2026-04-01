"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TIERS: Record<string, { label: string; accent: string }> = {
  enterprise:   { label: "Enterprise",   accent: "var(--neon-green)" },
  professional: { label: "Professional", accent: "var(--neon-blue)"  },
  standard:     { label: "Standard",     accent: "var(--neon-purple)"},
};

const FLAGS: Record<string, string> = { "us-east-1": "🇺🇸", "us-west-2": "🇺🇸", "eu-central-1": "🇩🇪", "ap-southeast-1": "🇸🇬" };

interface Provider {
  id: string; name: string; model: string; count: number; location: string; locationCode: string;
  basePrice: number; currentPrice: number; vram: string; ram: string; storage: string;
  status: string; utilization: number; tier: string; multiplier: number;
  providerWallet?: string;
}

export function GpuMarketplace() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [renting, setRenting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "available">("all");
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const go = async () => {
      try { const r = await fetch(`${API_BASE}/api/providers`); if (r.ok) { const d = await r.json(); setProviders(d.providers ?? []); setMultiplier(d.multiplier ?? 1); } }
      catch {}
    };
    go(); const i = setInterval(go, 10_000); return () => clearInterval(i);
  }, []);

  const rent = async (p: Provider) => {
    if (!publicKey || !connected) { alert("Connect your Phantom / Solflare wallet first."); return; }
    setRenting(p.id);
    try {
      const lamports = Math.round(p.currentPrice * 1e9);
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(p.providerWallet || publicKey.toBase58()), lamports }));
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      alert(`✅ Rented ${p.name}\n\nTX: ${sig.slice(0, 20)}…\nCost: ${p.currentPrice.toFixed(4)} SOL/hr\n\nExplorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    } catch (e: any) {
      if (!e.message?.includes("rejected")) alert(`❌ ${e.message}`);
    } finally { setRenting(null); }
  };

  const list = filter === "available" ? providers.filter(p => p.status === "available") : providers;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>GPU Marketplace</h2>
          <p className="mono" style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "3px" }}>
            {providers.filter(p => p.status === "available").length}/{providers.length} nodes available
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "available"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontFamily: "var(--font-mono)", fontSize: "9px", textTransform: "uppercase",
              letterSpacing: "0.08em", padding: "5px 11px", borderRadius: "5px", cursor: "pointer",
              background: filter === f ? "rgba(0,255,180,0.1)" : "transparent",
              border: `1px solid ${filter === f ? "var(--neon-green)" : "var(--bg-border)"}`,
              color: filter === f ? "var(--neon-green)" : "var(--text-secondary)",
              transition: "all .15s",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
        {list.map(p => {
          const tier = TIERS[p.tier] || TIERS.standard;
          const busy = p.status === "busy";
          const flag = FLAGS[p.locationCode] || "🌐";

          return (
            <div key={p.id} className="glass-card" style={{ padding: "18px 20px", opacity: busy ? 0.72 : 1 }}>
              {/* top accent */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: tier.accent, opacity: 0.55, borderRadius: "14px 14px 0 0" }} />

              {/* Status + tier */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: busy ? "var(--neon-red)" : "var(--neon-green)", display: "block" }} className={busy ? "" : "pulse-dot"} />
                  <span className="mono" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: busy ? "var(--neon-red)" : "var(--neon-green)" }}>
                    {busy ? "Busy" : "Available"}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 8px", borderRadius: "4px", background: `${tier.accent}14`, color: tier.accent, border: `1px solid ${tier.accent}30`, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {tier.label}
                </span>
              </div>

              {/* Name + location */}
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>{p.name}</h3>
              <p className="mono" style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                {flag} {p.location} · {p.count}× {p.model}
              </p>

              {/* Specs row */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                {[p.vram, p.ram, p.storage].map((v, idx) => (
                  <div key={idx} style={{ flex: 1, background: "var(--bg-raised)", border: "1px solid var(--bg-border)", borderRadius: "6px", padding: "6px 8px", textAlign: "center" }}>
                    <p className="mono" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>{v}</p>
                    <p className="mono" style={{ fontSize: "8px", color: "var(--text-dim)", textTransform: "uppercase", marginTop: "2px" }}>{["VRAM","RAM","SSD"][idx]}</p>
                  </div>
                ))}
              </div>

              {/* Utilization bar */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span className="mono" style={{ fontSize: "9px", color: "var(--text-dim)", textTransform: "uppercase" }}>Utilization</span>
                  <span className="mono" style={{ fontSize: "9px", color: p.utilization > 75 ? "var(--neon-red)" : "var(--neon-green)" }}>{p.utilization.toFixed(0)}%</span>
                </div>
                <div style={{ height: "3px", background: "var(--bg-raised)", borderRadius: "2px" }}>
                  <div style={{ height: "100%", borderRadius: "2px", width: `${p.utilization}%`, background: `linear-gradient(90deg, ${p.utilization > 75 ? "var(--neon-red)" : "var(--neon-green)"}88, ${p.utilization > 75 ? "var(--neon-red)" : "var(--neon-green)"})`, transition: "width 1s ease" }} />
                </div>
              </div>

              {/* Price + button */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div>
                  <p className="mono" style={{ fontSize: "9px", color: "var(--text-dim)", textDecoration: "line-through", marginBottom: "2px" }}>{p.basePrice.toFixed(2)} SOL/hr</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                    <span className="mono" style={{ fontSize: "22px", fontWeight: 700, color: multiplier > 1.05 ? "var(--neon-green)" : multiplier < 0.95 ? "var(--neon-red)" : "var(--text-primary)", letterSpacing: "-0.03em" }}>
                      {p.currentPrice.toFixed(4)}
                    </span>
                    <span className="mono" style={{ fontSize: "10px", color: "var(--text-secondary)" }}>SOL/hr</span>
                  </div>
                </div>
                <button onClick={() => rent(p)} disabled={!!renting || busy} className="btn-primary" style={{ padding: "9px 18px", fontSize: "12px" }}>
                  {renting === p.id ? "Signing…" : busy ? "Busy" : "Rent →"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
