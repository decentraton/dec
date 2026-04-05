import { PublicKey } from "@solana/web3.js";

/** Supported GPU models in the network */
export type GpuModel = "H100 80GB SXM5" | "A100 80GB PCIe" | "RTX 4090 24GB" | "RTX 3090 24GB";

/** Hardware tier for categorization */
export type GpuTier = "enterprise" | "professional" | "standard";

/** Real-world status of a GPU node */
export type GpuStatus = "available" | "busy" | "maintenance";

/** Full configuration for a GPU hardware provider */
export interface GpuProvider {
  id: string;
  name: string;
  model: GpuModel;
  count: number;
  location: string;
  locationCode: string;
  basePrice: number;
  vram: string;
  ram: string;
  storage: string;
  bandwidth: string;
  status: GpuStatus;
  utilization: number;
  providerWallet: string;
  tier: GpuTier;
}

/** AI Analysis result structure */
export interface AnalysisEntry {
  multiplier: number;
  reasoning: string;
  reasoningHash: string;
  timestamp: number;
  txSignature: string | null;
  event?: string;
  solPrice?: number;
  confidence?: number;
}

/** Result of an AI pricing decision */
export interface AiDecision {
  multiplier: number;
  reasoning: string;
  reasoningHash: string;
  confidence: number;
}

/** Market signals collected for AI processing */
export interface MarketSignals {
  solPrice: number;
  computeDemand: number; // 0-100
  gpuShortageLevel: number; // 0-100
  networkCongestion: number; // 0-100
  additionalEvents: string[];
}
