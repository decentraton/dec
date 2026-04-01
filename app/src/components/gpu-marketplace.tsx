"use client";

import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Provider {
  id: string;
  name: string;
  model: string;
  count: number;
  location: string;
  locationCode: string;
  basePrice: number;
  currentPrice: number;
  vram: string;
  ram: string;
  storage: string;
  bandwidth: string;
  status: string;
  utilization: number;
  tier: string;
  multiplier: number;
}

const TIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  enterprise: { bg: "rgba(0,255,180,0.08)", text: "var(--neon-green)", label: "Enterprise" },
  professional: { bg: "rgba(0,180,255,0.08)", text: "var(--neon-blue)", label: "Professional" },
  standard: { bg: "rgba(155,93,229,0.08)", text: "var(--neon-purple)", label: "Standard" },
};

const LOCATION_FLAGS: Record<string, string> = {
  "us-east-1": "🇺🇸",
  "us-west-2": "🇺🇸",
  "eu-central-1": "🇩🇪",
  "ap-southeast-1": "🇸🇬",
};

function UtilizationBar({ value }: { value: number }) {
  const color = value > 80 ? "var(--neon-red)" : value > 50 ? "var(--neon-orange)" : "var(--neon-green)";
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Utilization</span>
        <span className="mono text-[10px]" style={{ color }}>{value.toFixed(0)}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
    </div>
  );
}

export function GpuMarketplace() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [renting, setRenting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "available" | "enterprise">("all");
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/providers`);
        if (res.ok) {
          const d = await res.json();
          setProviders(d.providers || []);
          setMultiplier(d.multiplier || 1.0);
        }
      } catch {}
    };
    fetch_();
    const i = setInterval(fetch_, 10_000);
    return () => clearInterval(i);
  }, []);

  const handleRent = async (provider: Provider) => {
    if (!publicKey || !connected) {
      alert("Please connect your Phantom or Solflare wallet to rent hardware.");
      return;
    }

    setRenting(provider.id);
    try {
      // Real on-chain transaction: transfer rental fee to provider
      const lamports = Math.round(provider.currentPrice * 1e9); // SOL → lamports
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(provider.providerWallet || publicKey.toBase58()),
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      alert(`✅ Successfully rented ${provider.name}!\n\nTX: ${signature.slice(0, 16)}...\nCost: ${provider.currentPrice.toFixed(4)} SOL/hr\n\nView on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (e: any) {
      if (e.message?.includes("rejected")) {
        alert("Transaction cancelled.");
      } else {
        console.error(e);
        alert(`❌ Transaction failed: ${e.message}`);
      }
    } finally {
      setRenting(null);
    }
  };

  const filtered = providers.filter(p => {
    if (filter === "available") return p.status === "available";
    if (filter === "enterprise") return p.tier === "enterprise";
    return true;
  });

  return (
    <div className="anim-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 style={{ fontSize: "20px", color: "var(--text-primary)" }}>GPU Marketplace</h2>
          <p className="mono text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {providers.filter(p => p.status === "available").length} of {providers.length} nodes available
          </p>
        </div>
        {/* Filters */}
        <div className="flex gap-2">
          {(["all", "available", "enterprise"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded transition-all"
              style={{
                background: filter === f ? "rgba(0,255,180,0.1)" : "transparent",
                border: `1px solid ${filter === f ? "var(--neon-green)" : "var(--bg-border)"}`,
                color: filter === f ? "var(--neon-green)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((provider) => {
          const tier = TIER_COLORS[provider.tier] || TIER_COLORS.standard;
          const isRenting = renting === provider.id;
          const isBusy = provider.status === "busy";
          const flag = LOCATION_FLAGS[provider.locationCode] || "🌐";

          return (
            <div
              key={provider.id}
              className="glass-card p-5 relative"
              style={{ opacity: isBusy ? 0.75 : 1 }}
            >
              {/* Tier badge */}
              <div className="absolute top-4 right-4">
                <span className="badge" style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.text}33` }}>
                  {tier.label}
                </span>
              </div>

              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2 h-2 rounded-full pulse-dot"
                    style={{ background: isBusy ? "var(--neon-red)" : "var(--neon-green)", color: isBusy ? "var(--neon-red)" : "var(--neon-green)" }}
                  />
                  <span className="mono text-[10px] uppercase tracking-widest" style={{ color: isBusy ? "var(--neon-red)" : "var(--neon-green)" }}>
                    {isBusy ? "Busy" : "Available"}
                  </span>
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{provider.name}</h3>
                <p className="mono text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {flag} {provider.location} · {provider.count}× {provider.model}
                </p>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "VRAM", val: provider.vram },
                  { label: "RAM", val: provider.ram },
                  { label: "Storage", val: provider.storage },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg p-2" style={{ background: "var(--bg-raised)", border: "1px solid var(--bg-border)" }}>
                    <div className="mono text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--text-dim)" }}>{label}</div>
                    <div className="mono text-xs font-bold" style={{ color: "var(--text-primary)" }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Utilization */}
              <div className="mb-4">
                <UtilizationBar value={isBusy ? provider.utilization : provider.utilization} />
              </div>

              {/* Price + Rent button */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="mono text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-dim)" }}>
                    <span style={{ textDecoration: "line-through" }}>{provider.basePrice.toFixed(2)} SOL/hr base</span>
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="mono text-2xl font-bold" style={{ color: multiplier > 1.05 ? "var(--neon-green)" : multiplier < 0.95 ? "var(--neon-red)" : "var(--text-primary)" }}>
                      {provider.currentPrice.toFixed(4)}
                    </span>
                    <span className="mono text-xs" style={{ color: "var(--text-secondary)" }}>SOL/hr</span>
                    <span className="badge badge-blue mono text-[9px]">{multiplier.toFixed(2)}×</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRent(provider)}
                  disabled={isRenting || isBusy}
                  className="btn-primary"
                  style={{ padding: "10px 20px", fontSize: "13px" }}
                >
                  {isRenting ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                      Confirm...
                    </>
                  ) : isBusy ? "Busy" : "Rent Now"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
