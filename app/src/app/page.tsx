"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PricingBoard } from "../components/pricing-board";
import { AiReasoning } from "../components/ai-reasoning";
import { PriceChart } from "../components/price-chart";
import { DemoControls } from "../components/demo-controls";

// Dynamically import Wallet Multi Button to prevent hydration errors
const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/current-analysis`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        // History comes from the agent's in-memory rolling log
        if (data.history && Array.isArray(data.history)) {
          setHistory(data.history);
        }
      }
    } catch (e) {
      // Agent offline — silently retry on next interval
    }
  };

  useEffect(() => {
    fetchAnalysis();
    const interval = setInterval(fetchAnalysis, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-8 selection:bg-purple-500/30">
      <header className="flex justify-between items-center mb-12 border-b border-neutral-800 pb-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold">
            D
          </div>
          <h1 className="text-xl font-semibold tracking-tight">DePIN AI Oracle</h1>
        </div>
        <WalletMultiButtonDynamic />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Left Column (Pricing) */}
        <PricingBoard multiplier={analysis?.multiplier || 1.0} />

        {/* Right Column (Reasoning & Controls) */}
        <div className="space-y-6">
          <AiReasoning analysis={analysis} loading={loading} />
          <DemoControls onUpdate={() => {
            setLoading(true);
            setTimeout(() => {
              fetchAnalysis();
              setLoading(false);
            }, 1000);
          }} />
        </div>

        {/* Bottom Full Width Chart */}
        <PriceChart history={history} />
      </div>
    </div>
  );
}
