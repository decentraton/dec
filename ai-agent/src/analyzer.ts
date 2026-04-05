import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { fetchSolPrice } from "./utils/market.js";
// Dynamic reading of env keys

// Per-model API version
const MODEL_ENDPOINTS: Record<string, string> = {
  "gemini-2.5-flash-lite":  "https://generativelanguage.googleapis.com/v1beta",
};

const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
];

/** Strip markdown fences and code blocks, return parsed JSON */
function extractJson(raw: string): any {
  // Remove ```json\n...\n``` or ```\n...\n```
  let s = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  // Find outermost JSON object
  const start = s.indexOf("{");
  const end   = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return JSON.parse(s);
}

/** Normalise: AI sometimes returns 50-300 scale; convert to 0.5-3.0 */
function normMul(v: number): number {
  if (v > 10) v = v / 100;
  return parseFloat(Math.max(0.5, Math.min(3.0, v)).toFixed(3));
}

/** Call Gemini REST API directly (bypasses SDK's v1beta default) */
async function callGeminiRest(modelName: string, prompt: string): Promise<{ multiplier: number; reasoning: string }> {
  const base = MODEL_ENDPOINTS[modelName] || "https://generativelanguage.googleapis.com/v1";
  const currentKey = process.env.GEMINI_API_KEY || "";
  const url  = `${base}/models/${modelName}:generateContent?key=${currentKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
      candidateCount: 1,
      responseMimeType: "application/json",
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000), // Increased from 15s to 60s
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`HTTP ${resp.status}: ${(err as any).error?.message?.slice(0, 100) || resp.statusText}`);
  }

  const data: any = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response");

  let parsed;
  try {
    parsed = extractJson(text);
  } catch (err) {
    // Attempt naive repair for unterminated strings
    try {
      parsed = extractJson(text + '"}');
    } catch (e2) {
      throw new Error("Unterminated string or invalid JSON returned by AI");
    }
  }

  if (typeof parsed.multiplier !== "number") throw new Error("No multiplier in response");
  return { multiplier: normMul(parsed.multiplier), reasoning: String(parsed.reasoning || "") };
}

export async function analyzeWithAI(
  signals: any,
  genAI: GoogleGenerativeAI,
  openai: OpenAI
): Promise<{ multiplier: number; reasoning: string }> {

  const solPrice        = await fetchSolPrice();
  const enrichedSignals = { ...signals, solPrice, isoTime: new Date().toISOString() };

  const prompt = `You are an autonomous DePIN pricing oracle for GPU compute on Solana.

Market signals: ${JSON.stringify(enrichedSignals)}

Task: determine an optimal GPU rental price multiplier.
- 1.0  = base price (no change)
- >1.0 = price premium (high demand / GPU shortage / bull market)
- <1.0 = discount (low demand / bear market)
- Allowed range: 0.50 to 3.00
- Be decisive — do NOT always return 1.0

Respond ONLY with raw JSON, no markdown:
{"multiplier": 1.25, "reasoning": "Brief one-sentence reason."}`;

  // ── Try each Gemini model via v1 REST ──────────────────────
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[AI] Calling ${model} via v1 REST…`);
      const res = await callGeminiRest(model, prompt);
      console.log(`[AI] ✅ ${model} → ${res.multiplier}× | "${res.reasoning.slice(0, 60)}"`);
      return res;
    } catch (e: any) {
      console.warn(`[AI] ❌ ${model}: ${e.message?.slice(0, 120)}`);
    }
  }

  // ── Try OpenAI fallback ─────────────────────────────────────
  if ((process.env.GEMINI_API_KEY || "").length < 5 || true) { // also try if all Gemini fail
    try {
      console.log("[AI] Trying gpt-4o-mini…");
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 200,
      });
      const content = resp.choices[0].message?.content || "{}";
      const parsed  = JSON.parse(content);
      if (typeof parsed.multiplier !== "number") throw new Error("No multiplier");
      const mul = normMul(parsed.multiplier);
      console.log(`[AI] ✅ gpt-4o-mini → ${mul}×`);
      return { multiplier: mul, reasoning: String(parsed.reasoning || "") };
    } catch (e: any) {
      console.warn(`[AI] ❌ gpt-4o-mini: ${e.message?.slice(0, 100)}`);
    }
  }

  // ── Market-aware fallback (no AI) ───────────────────────────
  const fallback = solPrice > 150 ? 1.20 : solPrice > 100 ? 1.10 : solPrice < 60 ? 0.90 : 1.00;
  console.error(`[AI] All providers failed. Market fallback: ${fallback}×`);
  return {
    multiplier: fallback,
    reasoning: `AI unavailable. SOL @ $${solPrice.toFixed(2)} → market-implied ${fallback}×`,
  };
}
