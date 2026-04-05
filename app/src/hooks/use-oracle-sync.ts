import { useState, useEffect, useCallback } from "react";
import { AnalysisEntry, OracleStatus } from "../types/index";

const API_BASE = "http://localhost:3001";

/** 
 * Centralized hook to sync with the DePIN Oracle Agent.
 * Handles polling, status checks, and data consistency.
 */
export function useOracleSync() {
  const [status, setStatus] = useState<OracleStatus | null>(null);
  const [history, setHistory] = useState<AnalysisEntry[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/status`),
        fetch(`${API_BASE}/api/current-analysis`)
      ]);

      if (!statusRes.ok || !historyRes.ok) throw new Error("Oracle API Unreachable");

      const statusData = await statusRes.json();
      const historyData = await historyRes.json();

      setStatus(statusData);
      setHistory(historyData.history || []);
      setLastAnalysis(historyData.last || null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setStatus(prev => prev ? { ...prev, agent: "offline" } : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 10 seconds for real-time market drift updates
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    status,
    history,
    lastAnalysis,
    loading,
    error,
    refresh: fetchData
  };
}
