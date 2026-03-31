"use client";

import { useState, useCallback } from "react";
import { AlertCircle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ToastState {
  message: string;
  type: "success" | "error";
}

export function DemoControls({ onUpdate }: { onUpdate: () => void }) {
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const triggerEvent = async (endpoint: string) => {
    setActiveEvent(endpoint);
    try {
      const resp = await fetch(`${API_BASE}/api/simulate/${endpoint}`, {
        method: "POST",
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Server returned ${resp.status}`);
      }

      const data = await resp.json();
      showToast(
        `✅ Updated to ${data.multiplier}x — ${data.txSignature ? "TX confirmed" : "off-chain only"}`,
        "success"
      );
      onUpdate();
    } catch (e: any) {
      console.error("[DemoControls]", e);
      showToast(
        e.message === "Failed to fetch"
          ? "❌ Cannot reach AI Agent. Is it running on port 3001?"
          : `❌ ${e.message}`,
        "error"
      );
    } finally {
      setActiveEvent(null);
    }
  };

  const isLoading = activeEvent !== null;

  const events = [
    { key: "gpu_shortage", label: "Trigger GPU Shortage", Icon: AlertCircle, iconColor: "text-orange-400" },
    { key: "bull_run", label: "Trigger Crypto Bull Run", Icon: TrendingUp, iconColor: "text-green-400" },
    { key: "low_demand", label: "Trigger Market Correction", Icon: TrendingDown, iconColor: "text-red-400" },
  ] as const;

  return (
    <div className="p-6 bg-neutral-900/40 border border-neutral-800 rounded-2xl relative">
      <h4 className="text-xs text-neutral-400 uppercase tracking-wider mb-4 font-semibold">
        Simulator Controls (Demo)
      </h4>

      {/* Toast notification */}
      {toast && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all animate-[fadeIn_0.2s_ease-out] ${
            toast.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="space-y-3">
        {events.map(({ key, label, Icon, iconColor }) => (
          <button
            key={key}
            disabled={isLoading}
            onClick={() => triggerEvent(key)}
            className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-sm rounded-lg transition-colors border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-left px-4 flex items-center justify-between group"
          >
            <span className="flex items-center gap-2">
              {activeEvent === key ? (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              ) : (
                <Icon className={`w-4 h-4 ${iconColor}`} />
              )}
              {activeEvent === key ? "Processing..." : label}
            </span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-400">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
