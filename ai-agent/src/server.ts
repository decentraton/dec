import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { initSolanaClient, updateOnChain, PROGRAM_ID, syncOnChainStats } from "./solana-client.js";
import { analyzeWithAI } from "./analyzer.js";
import { DEMO_EVENTS, fetchMarketData } from "./mock-data.js";
import { fetchSolPrice, fetchNetworkStats, enrichWithMarketData } from "./market-oracle.js";

// ── .env ───────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
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

// ── In-memory state ────────────────────────────────────────────────────
interface AnalysisEntry {
    multiplier: number;
    reasoning: string;
    reasoningHash: string;
    timestamp: number;
    txSignature: string | null;
    event?: string;
    solPrice?: number;
    confidence?: number;
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
const SETTINGS_PATH = path.resolve(import.meta.dirname, "../data/settings.json");

let totalUpdates = 0;
let isAutonomousEnabled = false;

// ── Persistence Helpers ───────────────────────────────────────────────
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
            isAutonomousEnabled = !!data.isAutonomousEnabled;
            console.log(`[INIT] Loaded settings from disk: Autonomous=${isAutonomousEnabled}`);
        }
    } catch (err) {
        console.warn("[INIT] Could not load settings, using defaults.");
    }
}

function saveSettings() {
    try {
        const dir = path.dirname(SETTINGS_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ isAutonomousEnabled }, null, 2));
    } catch (err) {
        console.warn("[WARN] Failed to save settings to disk.");
    }
}

// Initial load
loadSettings();

// ── GPU Providers catalog ──────────────────────────────────────────────
const GPU_PROVIDERS = [
    {
        id: "h100-cluster-1",
        name: "NVIDIA H100 Cluster",
        model: "H100 80GB SXM5",
        count: 8,
        location: "US-East (Virginia)",
        locationCode: "us-east-1",
        basePrice: 2.0,
        vram: "80GB",
        ram: "2TB",
        storage: "20TB NVMe",
        bandwidth: "3.2 TB/s",
        status: "available",
        utilization: 0,
        providerWallet: "HafMKhcsd1sMSiCb47VoVRv8Z3UxHFF2X4R9QafuVTJp",
        tier: "enterprise",
    },
    {
        id: "a100-cluster-1",
        name: "NVIDIA A100 Pod",
        model: "A100 80GB PCIe",
        count: 4,
        location: "Europe (Frankfurt)",
        locationCode: "eu-central-1",
        basePrice: 1.2,
        vram: "80GB",
        ram: "1TB",
        storage: "10TB NVMe",
        bandwidth: "2.0 TB/s",
        status: "available",
        utilization: 0,
        providerWallet: "HafMKhcsd1sMSiCb47VoVRv8Z3UxHFF2X4R9QafuVTJp",
        tier: "professional",
    },
    {
        id: "rtx4090-node-1",
        name: "RTX 4090 Workstation",
        model: "RTX 4090 24GB",
        count: 1,
        location: "US-West (Oregon)",
        locationCode: "us-west-2",
        basePrice: 0.2,
        vram: "24GB",
        ram: "128GB",
        storage: "2TB NVMe",
        bandwidth: "N/A",
        status: "available",
        utilization: 0,
        providerWallet: "HafMKhcsd1sMSiCb47VoVRv8Z3UxHFF2X4R9QafuVTJp",
        tier: "standard",
    },
    {
        id: "rtx3090-node-1",
        name: "RTX 3090 Node",
        model: "RTX 3090 24GB",
        count: 2,
        location: "Asia-Pacific (Singapore)",
        locationCode: "ap-southeast-1",
        basePrice: 0.12,
        vram: "24GB",
        ram: "64GB",
        storage: "1TB NVMe",
        bandwidth: "N/A",
        status: "busy",
        utilization: 87,
        providerWallet: "HafMKhcsd1sMSiCb47VoVRv8Z3UxHFF2X4R9QafuVTJp",
        tier: "standard",
    },
];

// Randomize utilization occasionally
function updateUtilization() {
    GPU_PROVIDERS.forEach((p) => {
        if (p.status !== "busy") {
            p.utilization = Math.max(0, Math.min(95, p.utilization + (Math.random() - 0.5) * 15));
        }
    });
}

setInterval(updateUtilization, 30_000);

// ── Helpers ────────────────────────────────────────────────────────────
function hashReasoning(reasoning: string): string {
    return crypto.createHash("sha256").update(reasoning).digest("hex");
}

function pushHistory(entry: AnalysisEntry) {
    analysisHistory.push(entry);
    if (analysisHistory.length > 50) analysisHistory.shift();
}

// ── Routes ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: Date.now() - startTime });
});

app.get("/api/status", (_req: Request, res: Response) => {
    res.json({
        agent: "online",
        wallet: oracleKeypair.publicKey.toBase58(),
        programId: PROGRAM_ID.toBase58(),
        rpcUrl: RPC_URL,
        totalUpdates,
        uptimeMs: Date.now() - startTime,
        programLoaded: program !== null,
        isAutonomousEnabled,
    });
});

app.get("/api/settings", (_req: Request, res: Response) => {
    res.json({ isAutonomousEnabled });
});

app.post("/api/settings/toggle", (req: Request, res: Response) => {
    if (typeof req.body.enabled === "boolean") {
        isAutonomousEnabled = req.body.enabled;
    } else {
        isAutonomousEnabled = !isAutonomousEnabled;
    }
    saveSettings();
    console.log(`[SETTINGS] Autonomous mode is now: ${isAutonomousEnabled ? "ON" : "OFF"}`);
    res.json({ isAutonomousEnabled });
});

app.get("/api/current-analysis", (_req: Request, res: Response) => {
    res.json({
        ...lastAnalysis,
        history: analysisHistory,
    });
});

/** Real SOL/USD price from CoinGecko */
app.get("/api/sol-price", async (_req: Request, res: Response) => {
    try {
        const price = await fetchSolPrice();
        res.json(price);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** Network stats */
app.get("/api/network-stats", async (_req: Request, res: Response) => {
    try {
        const stats = await fetchNetworkStats(connection);
        res.json(stats);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/** GPU providers with live pricing */
app.get("/api/providers", (_req: Request, res: Response) => {
    const m = lastAnalysis.multiplier || 1.0;
    const providers = GPU_PROVIDERS.map((p) => ({
        ...p,
        currentPrice: parseFloat((p.basePrice * m).toFixed(4)),
        multiplier: m,
    }));
    res.json({ providers, multiplier: m, lastUpdate: lastAnalysis.timestamp });
});

/** Full event feed with pagination */
app.get("/api/events-feed", (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");
    const start = (page - 1) * limit;
    const items = [...analysisHistory].reverse().slice(start, start + limit);
    res.json({
        events: items,
        total: analysisHistory.length,
        page,
        hasMore: start + limit < analysisHistory.length,
    });
});

/** Trigger a simulated market event */
app.post("/api/simulate/:event", async (req: Request, res: Response) => {
    const eventKey = req.params.event as string;
    const mockData = DEMO_EVENTS[eventKey];

    if (!mockData) {
        return res.status(404).json({ error: `Unknown event "${eventKey}". Available: ${Object.keys(DEMO_EVENTS).join(", ")}` });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[ SIMULATE ] ──── ${eventKey.toUpperCase()} ────`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    try {
        const enriched = await enrichWithMarketData(mockData);
        const decision = await analyzeWithAI(enriched, genAI, openai);
        const rHash = hashReasoning(decision.reasoning);
        const mulScaled = Math.round(decision.multiplier * 100); // 1.25 → 125 for on-chain
        const tx = await updateOnChain(program, oracleKeypair, mulScaled, decision.reasoning);

        const entry: AnalysisEntry = {
            multiplier: decision.multiplier,  // store 0.5-3.0 scale
            reasoning: decision.reasoning,
            reasoningHash: rHash,
            timestamp: Date.now(),
            txSignature: tx,
            event: eventKey,
            solPrice: enriched.solPrice,
            confidence: Math.floor(60 + Math.random() * 35),
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

/** Trigger an organic AI update */
app.post("/api/trigger-update", async (req: Request, res: Response) => {
    try {
        const signals = fetchMarketData();
        const enriched = await enrichWithMarketData(signals);
        const decision = await analyzeWithAI(enriched, genAI, openai);
        const rHash = hashReasoning(decision.reasoning);
        const mulScaled = Math.round(decision.multiplier * 100); // 1.15 → 115
        const tx = await updateOnChain(program, oracleKeypair, mulScaled, decision.reasoning);

        const entry: AnalysisEntry = {
            multiplier: decision.multiplier,
            reasoning: decision.reasoning,
            reasoningHash: rHash,
            timestamp: Date.now(),
            txSignature: tx,
            event: "organic",
            solPrice: enriched.solPrice,
            confidence: Math.floor(60 + Math.random() * 35),
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
    if (!isAutonomousEnabled) {
        console.log(`[AUTONOMOUS] ⏸  Paused (Organic AI Update is OFF).`);
        setTimeout(runAutonomousUpdate, 15000); // Poll more frequently while paused to be responsive to toggle
        return;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[ AUTONOMOUS ] ──── Periodic Update Cycle ────`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    try {
        const signals = fetchMarketData();
        const enriched = await enrichWithMarketData(signals);
        const decision = await analyzeWithAI(enriched, genAI, openai);
        const rHash = hashReasoning(decision.reasoning);
        const mulScaled = Math.round(decision.multiplier * 100); // 1.20 → 120
        const tx = await updateOnChain(program, oracleKeypair, mulScaled, decision.reasoning);

        if (tx) {
            const solPrice = await fetchSolPrice();
            const entry: AnalysisEntry = {
                multiplier: decision.multiplier,  // store 0.5-3.0
                reasoning: decision.reasoning,
                reasoningHash: rHash,
                timestamp: Date.now(),
                txSignature: tx,
                event: "autonomous",
                solPrice: solPrice.usd,
                confidence: Math.floor(60 + Math.random() * 35),
            };
            lastAnalysis = entry;
            pushHistory(entry);
            totalUpdates++;
            console.log(`[ AUTONOMOUS ] [ SUCCESS ] Multiplier: ${decision.multiplier.toFixed(3)}x | TX: ${tx.slice(0, 32)}...`);
        }
    } catch (err: any) {
        if (err.message?.includes("CooldownNotElapsed")) {
            console.log("[AUTONOMOUS] ⏭  Cooldown not elapsed, skipping update.");
        } else {
            console.error("[AUTONOMOUS] Error:", err.message);
        }
    }
    setTimeout(runAutonomousUpdate, 60000);
}

// ── Boot ───────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`\n🤖 DePIN Oracle API running on http://localhost:${PORT}`);
    
    // ── Sync with on-chain state ───────────────────────────────────────
    const onChainStats = await syncOnChainStats(program, oracleKeypair.publicKey);
    totalUpdates = onChainStats.totalUpdates;
    if (onChainStats.history.length > 0) {
        onChainStats.history.forEach(e => analysisHistory.push(e as any));
        const last = onChainStats.history[onChainStats.history.length - 1];
        lastAnalysis = {
            multiplier: last.multiplier,
            reasoning: last.reasoning,
            reasoningHash: last.reasoningHash,
            timestamp: last.timestamp,
            txSignature: "ON-CHAIN",
            solPrice: 0, // Will be updated by first cycle
            confidence: last.confidence || 75
        };
    }

    console.log(`   Wallet:  ${oracleKeypair.publicKey.toBase58()}`);
    console.log(`   Program: ${PROGRAM_ID.toBase58()}`);
    console.log(`   RPC:     ${RPC_URL}`);
    console.log(`   Mode:    AUTONOMOUS (Updates every 60s)`);
    runAutonomousUpdate();

    console.log(`\n📡 Endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/status`);
    console.log(`   GET  /api/sol-price`);
    console.log(`   GET  /api/network-stats`);
    console.log(`   GET  /api/providers`);
    console.log(`   GET  /api/events-feed`);
    console.log(`   GET  /api/current-analysis`);
    console.log(`   POST /api/simulate/:event  (gpu_shortage | bull_run | low_demand)`);
    console.log(`   POST /api/trigger-update`);
    console.log();
});
