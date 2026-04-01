"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TIER: Record<string, { c: string; l: string }> = {
  enterprise:   { c: "var(--acid)", l: "Enterprise" },
  professional: { c: "var(--cyan)", l: "Professional" },
  standard:     { c: "var(--amber)", l: "Standard" },
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
  const [provs, setProvs]     = useState<Prov[]>([]);
  const [mul,   setMul]       = useState(1);
  const [busy,  setBusy]      = useState<string | null>(null);
  const [filter, setFilter]   = useState<"all"|"available">("all");
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const go = async () => {
      try { const r = await fetch(`${API_BASE}/api/providers`); if (r.ok) { const d = await r.json(); setProvs(d.providers ?? []); setMul(d.multiplier ?? 1); } }
      catch {}
    };
    go(); const i = setInterval(go, 10_000); return () => clearInterval(i);
  }, []);

  const rent = async (p: Prov) => {
    if (!publicKey || !connected) { alert("Connect your Phantom / Solflare wallet first."); return; }
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
      alert(`✅ Rented ${p.name}\n\nSignature: ${sig.slice(0, 24)}…\nCost: ${p.currentPrice.toFixed(4)} SOL/hr\n\nhttps://explorer.solana.com/tx/${sig}?cluster=devnet`);
    } catch (e: any) {
      if (!e.message?.includes("rejected")) alert(`Transaction failed — ${e.message}`);
    } finally { setBusy(null); }
  };

  const list = filter === "available" ? provs.filter(p => p.status === "available") : provs;
  const avail = provs.filter(p => p.status === "available").length;

  return (
    <section aria-label="GPU Marketplace">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--t1)", marginBottom: "3px" }}>
            GPU Marketplace
          </h2>
          <p style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)" }}>
            <span style={{ color: "var(--acid)", fontVariantNumeric: "tabular-nums" }}>{avail}</span> / {provs.length} nodes available · multiplier{" "}
            <span style={{ color: mul > 1.05 ? "var(--acid)" : mul < 0.95 ? "var(--red)" : "var(--t2)", fontVariantNumeric: "tabular-nums" }}>{mul.toFixed(2)}×</span>
          </p>
        </div>
        {/* Filter tabs */}
        <div role="tablist" aria-label="Filter nodes" style={{ display: "flex", gap: "4px" }}>
          {(["all", "available"] as const).map(f => (
            <button
              key={f} role="tab" aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`btn btn-${filter === f ? "acid" : "dim"}`}
              style={{ height: "30px", padding: "0 12px", fontSize: "9px" }}
            >
              {f === "all" ? "All Nodes" : "Available"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px" }}>
        {list.map(p => {
          const t   = TIER[p.tier] || TIER.standard;
          const off = p.status === "busy";
          const util = p.utilization;
          const uCol = util > 75 ? "var(--red)" : util > 40 ? "var(--amber)" : "var(--acid)";

          return (
            <article key={p.id} className="card" style={{ padding: "16px 18px", opacity: off ? 0.65 : 1, borderColor: off ? "var(--line)" : `${t.c}22` }}>
              {/* top accent line */}
              <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: t.c, opacity: 0.6, borderRadius: "10px 10px 0 0" }} />

              {/* Status row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span
                    aria-hidden="true"
                    style={{ width: "5px", height: "5px", borderRadius: "50%", background: off ? "var(--red)" : "var(--acid)", display: "block", flexShrink: 0 }}
                    className={off ? "" : "live-dot"}
                  />
                  <span style={{ fontFamily: "var(--mono)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: off ? "var(--red)" : "var(--acid)" }}>
                    {off ? "Busy" : "Available"}
                  </span>
                </div>
                <span className="tag" style={{ background: `${t.c}12`, color: t.c, border: `1px solid ${t.c}28`, fontSize: "8px" }}>
                  {t.l}
                </span>
              </div>

              {/* Name */}
              <h3 style={{ fontFamily: "var(--sans)", fontSize: "14px", fontWeight: 700, color: "var(--t1)", marginBottom: "2px", textWrap: "balance" }}>
                {p.name}
              </h3>
              <p style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--t3)", marginBottom: "12px" }} className="min-w-0 truncate">
                {FLAG[p.locationCode] ?? "🌐"} {p.location} · {p.count}× {p.model}
              </p>

              {/* Specs */}
              <div style={{ display: "flex", gap: "5px", marginBottom: "11px" }}>
                {([["VRAM", p.vram], ["RAM", p.ram], ["SSD", p.storage]] as const).map(([l, v]) => (
                  <div key={l} style={{ flex: 1, background: "var(--raised)", border: "1px solid var(--line)", borderRadius: "5px", padding: "5px 7px", textAlign: "center", minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 700, color: "var(--t1)" }} className="truncate">{v}</p>
                    <p className="label" style={{ fontSize: "8px", marginTop: "1px" }}>{l}</p>
                  </div>
                ))}
              </div>

              {/* Utilization */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span className="label">Utilization</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: uCol, fontVariantNumeric: "tabular-nums" }}>{util.toFixed(0)}%</span>
                </div>
                <div role="progressbar" aria-valuenow={util} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} utilization ${util.toFixed(0)}%`}
                  style={{ height: "3px", background: "var(--raised)", borderRadius: "2px" }}>
                  <div style={{ height: "100%", borderRadius: "2px", width: `${util}%`, background: uCol, transition: "width 1s ease" }} />
                </div>
              </div>

              {/* Price + CTA */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8px" }}>
                <div className="min-w-0">
                  <p style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--t3)", textDecoration: "line-through", marginBottom: "2px", fontVariantNumeric: "tabular-nums" }}>
                    {p.basePrice.toFixed(2)} SOL/hr base
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span className="num-md" style={{ color: mul > 1.05 ? "var(--acid)" : mul < 0.95 ? "var(--red)" : "var(--t1)", fontSize: "20px" }}>
                      {p.currentPrice.toFixed(4)}
                    </span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--t3)" }}>SOL/hr</span>
                  </div>
                </div>
                <button
                  onClick={() => rent(p)}
                  disabled={!!busy || off}
                  className="btn btn-acid"
                  aria-label={`Rent ${p.name} for ${p.currentPrice.toFixed(4)} SOL per hour`}
                  style={{ flexShrink: 0, height: "34px" }}
                >
                  {busy === p.id ? "Signing…" : off ? "Busy" : "Rent →"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
