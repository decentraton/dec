/** AI Analysis record from the oracle */
export interface AnalysisEntry {
  multiplier: number;
  reasoning: string;
  reasoningHash: string;
  confidence: number;
  timestamp: number;
  txSignature: string | null;
  solPrice?: number;
  event?: "autonomous" | "manual";
}

/** Oracle Agent real-time status */
export interface OracleStatus {
  agent: "online" | "offline";
  wallet: string;
  totalUpdates: number;
  lastUpdate: number | null;
}

/** GPU Provider display data */
export interface GpuProvider {
  id: string;
  name: string;
  model: string;
  count: number;
  basePrice: number;
  multiplier: number;
  status: "available" | "busy" | "maintenance";
  tier: "enterprise" | "professional" | "standard";
}
