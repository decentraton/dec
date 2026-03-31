import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { fetchSolPrice } from "./utils/market.js";

export async function analyzeWithAI(signals: any, genAI: GoogleGenerativeAI, openai: OpenAI): Promise<{ multiplier: number; reasoning: string }> {
  // Enrich signals with real-market data
  const solPrice = await fetchSolPrice();
  const enrichedSignals = { ...signals, solPrice };

  const prompt = `You are an autonomous DePIN pricing oracle for GPU compute rentals.
Current market signals: ${JSON.stringify(enrichedSignals)}.
Calculate a price multiplier. 100 = 1.0x (base price).
Range: min 50 (0.5x) to max 300 (3.0x).
Respond ONLY with valid JSON, no markdown:
{ "multiplier": 150, "reasoning": "One sentence explanation." }`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch (e: any) {
    console.warn(`[AI] Gemini failed: ${e.message?.slice(0, 100)}...`);
    
    // Fallback
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const content = response.choices[0].message?.content || "{}";
      return JSON.parse(content);
    } catch (oaiErr: any) {
      console.error("[AI] OpenAI fallback failed");
    }
  }

  return { multiplier: 100, reasoning: "Fallback to baseline due to AI provider errors." };
}
