import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { initSolanaClient, updateOnChain, PROGRAM_ID } from "./solana-client.js";
import { analyzeWithAI } from "./analyzer.js";
import { DEMO_EVENTS, fetchMarketData } from "./mock-data.js";

// ── .env ───────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const PORT = process.env.PORT || 3001;

// ── SDKs ───────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const { program, oracleKeypair, connection } = initSolanaClient(RPC_URL);

// ── In-memory history (the on-chain PriceHistory PDA stores only last  ─
//    10 entries; here we also keep a rolling log so the frontend chart   ─
//    can render without additional RPC calls)                            ─
interface AnalysisEntry {
    multiplier: number;
    reasoning: string;
    reasoningHash: string;
    timestamp: number;
    txSignature: string | null;
}

let lastAnalysis: AnalysisEntry = {
    multiplier: 1.0,
    reasoning: "Waiting for first market signal...",
    reasoningHash: "",
    timestamp: Date.now(),
    txSignature: null,
};

const analysisHistory: AnalysisEntry[] = [];
const startTime = Date.now();
let totalUpdates = 0;

// ── Helpers ────────────────────────────────────────────────────────────
function hashReasoning(reasoning: string): string {
    return crypto.createHash("sha256").update(reasoning).digest("hex");
}

function pushHistory(entry: AnalysisEntry) {
    analysisHistory.push(entry);
    // Keep only last 50 entries in memory
    if (analysisHistory.length > 50) analysisHistory.shift();
}

// ── Routes ─────────────────────────────────────────────────────────────

/** Basic liveness probe */
app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: Date.now() - startTime });
});

/** Extended status — wallet, program, counters */
app.get("/api/status", (_req: Request, res: Response) => {
    res.json({
        agent: "online",
        wallet: oracleKeypair.publicKey.toBase58(),
        programId: PROGRAM_ID.toBase58(),
        rpcUrl: RPC_URL,
        totalUpdates,
        uptimeMs: Date.now() - startTime,
        programLoaded: program !== null,
    });
});

/** Last analysis + its full history */
app.get("/api/current-analysis", (_req: Request, res: Response) => {
    res.json({
        ...lastAnalysis,
        history: analysisHistory,
    });
});

/** Trigger a simulated market event (for demo) */
app.post("/api/simulate/:event", async (req: Request, res: Response) => {
    const eventKey = req.params.event as string;
    const mockData = DEMO_EVENTS[eventKey];

    if (!mockData) {
        return res.status(404).json({ error: `Unknown event "${eventKey}". Available: ${Object.keys(DEMO_EVENTS).join(", ")}` });
    }

    console.log(`\n[SIMULATE] ──── ${eventKey} ────`);
    try {
        const decision = await analyzeWithAI(mockData, genAI, openai);
        const rHash = hashReasoning(decision.reasoning);

        const tx = await updateOnChain(program, oracleKeypair, decision.multiplier, decision.reasoning);

        const entry: AnalysisEntry = {
            multiplier: decision.multiplier / 100,
            reasoning: decision.reasoning,
            reasoningHash: rHash,
            timestamp: Date.now(),
            txSignature: tx,
        };
        lastAnalysis = entry;
        pushHistory(entry);
        totalUpdates++;

        res.json({ success: true, ...entry });
    } catch (err: any) {
        console.error("[SIMULATE] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/** Trigger an organic AI update from random market data */
app.post("/api/trigger-update", async (req: Request, res: Response) => {
    try {
        const signals = fetchMarketData();
        const decision = await analyzeWithAI(signals, genAI, openai);
        const rHash = hashReasoning(decision.reasoning);

        const tx = await updateOnChain(program, oracleKeypair, decision.multiplier, decision.reasoning);

        const entry: AnalysisEntry = {
            multiplier: decision.multiplier / 100,
            reasoning: decision.reasoning,
            reasoningHash: rHash,
            timestamp: Date.now(),
            txSignature: tx,
        };
        lastAnalysis = entry;
        pushHistory(entry);
        totalUpdates++;

        res.json({ success: true, ...entry });
    } catch (err: any) {
        console.error("[TRIGGER] Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Autonomous Loop ────────────────────────────────────────────────────
async function runAutonomousUpdate() {
    console.log(`\n[AUTONOMOUS] ──── Triggering periodic update ────`);
    try {
        const signals = fetchMarketData();
        const decision = await analyzeWithAI(signals, genAI, openai);
        const rHash = hashReasoning(decision.reasoning);

        const tx = await updateOnChain(program, oracleKeypair, decision.multiplier, decision.reasoning);

        if (tx) {
            const entry: AnalysisEntry = {
                multiplier: decision.multiplier / 100,
                reasoning: decision.reasoning,
                reasoningHash: rHash,
                timestamp: Date.now(),
                txSignature: tx,
            };
            lastAnalysis = entry;
            pushHistory(entry);
            totalUpdates++;
            console.log(`[AUTONOMOUS] ✅ Update successful: ${tx}`);
        }
    } catch (err: any) {
        if (err.message?.includes("CooldownNotElapsed")) {
            console.log("[AUTONOMOUS] ⏭  Cooldown not elapsed, skipping update.");
        } else {
            console.error("[AUTONOMOUS] Error:", err.message);
        }
    }

    // Schedule next update in 60 seconds
    setTimeout(runAutonomousUpdate, 60000);
}

// ── Boot ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🤖 DePIN Oracle API running on http://localhost:${PORT}`);
    console.log(`   Wallet:  ${oracleKeypair.publicKey.toBase58()}`);
    console.log(`   Program: ${PROGRAM_ID.toBase58()}`);
    console.log(`   RPC:     ${RPC_URL}`);
    
    // Start the autonomous loop
    console.log(`   Mode:    AUTONOMOUS (Updates every 60s)`);
    runAutonomousUpdate();

    console.log(`\n📡 Endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/status`);
    console.log(`   GET  /api/current-analysis`);
    console.log(`   POST /api/simulate/:event  (gpu_shortage | bull_run | low_demand)`);
    console.log(`   POST /api/trigger-update`);
    console.log();
});
