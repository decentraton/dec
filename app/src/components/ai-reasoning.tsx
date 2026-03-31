"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AgentStatus {
    agent: string;
    wallet: string;
    totalUpdates: number;
    uptimeMs: number;
    programLoaded: boolean;
}

export function AiReasoning({ analysis, loading }: { analysis: any; loading: boolean }) {
    const [agentOnline, setAgentOnline] = useState(false);
    const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

    // Poll agent health every 5 seconds
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/status`);
                if (res.ok) {
                    setAgentOnline(true);
                    setAgentStatus(await res.json());
                } else {
                    setAgentOnline(false);
                }
            } catch {
                setAgentOnline(false);
            }
        };

        check();
        const interval = setInterval(check, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (ms: number) => {
        const secs = Math.floor(ms / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s}s`;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-medium tracking-tight mb-4 text-neutral-200">
                Oracle Status
            </h2>

            <div className="p-6 bg-neutral-900/80 border border-purple-500/30 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.05)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>

                {/* Agent Status Indicator */}
                <div className="flex items-center gap-2 mb-5">
                    <div
                        className={`w-2.5 h-2.5 rounded-full ${
                            agentOnline
                                ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                        }`}
                    ></div>
                    <span
                        className={`text-xs font-bold uppercase tracking-widest ${
                            agentOnline ? "text-green-400" : "text-red-400"
                        }`}
                    >
                        {agentOnline ? "Live: Gemini 2.5" : "Agent Offline"}
                    </span>
                </div>

                {/* Agent Quick Stats */}
                {agentStatus && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-black/30 rounded px-2 py-1.5 border border-neutral-800">
                            <p className="text-[10px] text-neutral-500 uppercase">Updates</p>
                            <p className="text-xs font-mono text-neutral-300">{agentStatus.totalUpdates}</p>
                        </div>
                        <div className="bg-black/30 rounded px-2 py-1.5 border border-neutral-800">
                            <p className="text-[10px] text-neutral-500 uppercase">Uptime</p>
                            <p className="text-xs font-mono text-neutral-300">{formatUptime(agentStatus.uptimeMs)}</p>
                        </div>
                    </div>
                )}

                {/* Reasoning Hash */}
                <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-semibold">
                    Reasoning Hash (SHA-256)
                </h4>
                <div className="bg-black/50 p-2 rounded text-xs font-mono text-neutral-400 break-all mb-4 border border-neutral-800">
                    {loading
                        ? "computing..."
                        : analysis?.reasoningHash
                        ? `0x${analysis.reasoningHash.slice(0, 16)}...${analysis.reasoningHash.slice(-8)}`
                        : "—"
                    }
                </div>

                {/* Oracle Analysis */}
                <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2 font-semibold">
                    Oracle Analysis
                </h4>
                <p className="text-sm leading-relaxed mb-4 text-neutral-200 min-h-[40px]">
                    {loading ? (
                        <span className="flex items-center gap-2 text-neutral-400 animate-pulse">
                            Analyzing latest market dataset...
                        </span>
                    ) : (
                        analysis?.reasoning || "Waiting for signal..."
                    )}
                </p>

                {/* TX Link */}
                {analysis?.txSignature && (
                    <a
                        href={`https://explorer.solana.com/tx/${analysis.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mb-4 text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
                    >
                        View on Solana Explorer ↗
                    </a>
                )}

                {/* Footer Stats */}
                <div className="flex justify-between items-end text-xs font-medium border-t border-neutral-800/80 pt-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-neutral-500 uppercase">Last Update</span>
                        <span className="text-neutral-100 text-sm">
                            {analysis?.timestamp
                                ? new Date(analysis.timestamp).toLocaleTimeString()
                                : "—"}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                        <span className="text-neutral-500 uppercase">Applied Multiplier</span>
                        <span
                            className={`text-sm font-bold ${
                                analysis?.multiplier > 1
                                    ? "text-green-400"
                                    : analysis?.multiplier < 1
                                    ? "text-red-400"
                                    : "text-neutral-100"
                            }`}
                        >
                            {analysis?.multiplier || 1.0}x
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
