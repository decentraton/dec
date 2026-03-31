"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useState } from "react";

export function PricingBoard({ multiplier }: { multiplier: number }) {
  const { publicKey } = useWallet();
  const [renting, setRenting] = useState(false);

  const basePriceH100 = 2.0;
  const basePrice4090 = 0.2;

  const handleRent = async (gpu: string) => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    setRenting(true);
    try {
      // In a full implementation, you'd use Anchor program.methods.rentHardware().rpc()
      alert(`Simulation: Rented ${gpu} successfully at multiplier ${multiplier}x!`);
    } catch (e) {
      console.error(e);
      alert("Failed to rent hardware.");
    } finally {
      setRenting(false);
    }
  };

  return (
    <div className="lg:col-span-2 space-y-6">
      <h2 className="text-xl font-medium tracking-tight mb-4 text-neutral-200">
        Available Compute
      </h2>

      {/* H100 Card */}
      <div className="p-6 bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex justify-between items-start mb-6 relative">
          <div>
            <h3 className="text-lg font-bold text-neutral-100">NVIDIA H100 Cluster</h3>
            <p className="text-neutral-400 text-sm mt-1">8x H100 80GB SXM5 • US-East</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500 line-through mb-1">
              Base: {basePriceH100.toFixed(2)} SOL/hr
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`text-3xl font-black ${
                  multiplier > 1 ? "text-green-400" : multiplier < 1 ? "text-red-400" : "text-neutral-100"
                }`}
              >
                {(basePriceH100 * multiplier).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-neutral-400">SOL/hr</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => handleRent("H100")}
          disabled={renting}
          className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-900 font-bold rounded-xl transition-all active:scale-[0.98] relative"
        >
          {renting ? "Renting..." : "Rent Hardware"}
        </button>
      </div>

      {/* 4090 Card */}
      <div className="p-6 bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-2xl relative overflow-hidden group">
        <div className="flex justify-between items-start mb-6 relative">
          <div>
            <h3 className="text-lg font-bold text-neutral-100">NVIDIA RTX 4090</h3>
            <p className="text-neutral-400 text-sm mt-1">Single GPU • Europe</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500 line-through mb-1">
              Base: {basePrice4090.toFixed(2)} SOL/hr
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`text-3xl font-black ${
                  multiplier > 1 ? "text-green-400" : multiplier < 1 ? "text-red-400" : "text-neutral-100"
                }`}
              >
                {(basePrice4090 * multiplier).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-neutral-400">SOL/hr</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => handleRent("RTX4090")}
          disabled={renting}
          className="w-full py-3 bg-neutral-100 hover:bg-white text-neutral-900 font-bold rounded-xl transition-all active:scale-[0.98]"
        >
          {renting ? "Renting..." : "Rent Hardware"}
        </button>
      </div>
    </div>
  );
}
