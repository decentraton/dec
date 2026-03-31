# Autonomous DePIN Pricing Network (Solana + AI)

> National Solana Hackathon 2025

AI-powered dynamic pricing oracle for DePIN GPU compute networks, built on Solana. This protocol continuously adjusts price multipliers based on real-time market signals using autonomous agents integrated with Google Gemini 1.5 Flash (and OpenAI fallback).

---

## 🚀 Key Features

*   **Autonomous Oracle:** Fully automated pricing loop that analyzes market scenarios and updates on-chain state.
*   **Multi-Model AI Resiliency:** Automatically switches between **Gemini 1.5 Flash** and **OpenAI (GPT-4o-mini)** if one provider hits quota limits or fails.
*   **On-Chain Governance:** Direct price adjustments written to PDA-based `ProviderConfig` and `PriceHistory` accounts.
*   **Real-Time Simulation:** Frontend dashboard to trigger market events (GPU shortage, bull run, etc.) and see AI reactions in real-time.
*   **Escrow-Based Rentals:** Secure hardware rental mechanism with dynamic pricing and provider withdrawals.

---

## 🛠️ Project Structure

*   **/programs/depin_pricing:** Rust-based Anchor smart contract.
*   **/ai-agent:** Node.js Pricing Agent logic with multi-provider fallback.
*   **/app:** Next.js frontend dashboard and rental UI.
*   **/target/idl:** Anchor 0.30.1 compliant IDL for off-chain integration.

---

## 📋 System Requirements & Setup

### Global Prerequisites
*   **Rust & Cargo (v1.75.0+):** Required for compiling the Anchor smart contract.
*   **Solana CLI (v1.18.x+):** Standard toolkit for interacting with the Solana network.
*   **Anchor CLI (v0.30.1 precisely):** Essential for build and deployment consistency.
*   **Node.js (v20.x+):** Runtime environment for the Pricing Agent and Frontend.
*   **npm or yarn:** Package managers for dependencies.

### Local Configuration
*   **Devnet Balance:** Your CLI wallet (`id.json`) must have at least 2-3 SOL for deployment.
*   **API Keys:** Active keys for Google Gemini (Flash 1.5) and OpenAI (optional fallback).
*   **Helius RPC:** Recommended for stable Devnet connection.

---

## ⚡ Quick Start (Demo)

> **⚠️ Important: Local Demo Architecture**
>
> This project uses a **local AI Agent server** (`localhost:3001`) that the
> Next.js frontend communicates with. Both must run on the **same machine**
> during the demo to avoid CORS/network issues.

### 1. Environment Setup
Create a `.env` in the project root:
```env
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=xxx
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key  # optional fallback
```

### 2. Deploy Smart Contract
```bash
cd depin_pricing
anchor build
anchor deploy --provider.cluster devnet
```

### 3. Initialize & Start AI Agent
```bash
cd ai-agent
npm install
npm run init   # Creates ProtocolConfig + ProviderConfig PDAs
npm run start  # Starts Express API on http://localhost:3001
```

### 4. Start Frontend
```bash
cd app
npm install
npm run dev    # Next.js on http://localhost:3000
```

---

## 🏗️ Architecture

```
┌──────────────┐     POST /api/simulate/:event     ┌──────────────┐
│              │ ──────────────────────────────────▶ │              │
│   Next.js    │     GET /api/current-analysis      │  AI Agent    │
│   Frontend   │ ◀────────────────────────────────── │  (Express)   │
│  (:3000)     │     GET /api/status                │  (:3001)     │
└──────────────┘                                    └──────┬───────┘
       │                                                   │
       │  Wallet Adapter                    updateMultiplier RPC
       │  (Phantom / Solflare)                             │
       ▼                                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    Solana Devnet                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ ProtocolConfig │  │ ProviderConfig │  │  PriceHistory  │  │
│  │  (admin,       │  │  (base_price,  │  │  (last 10      │  │
│  │   oracle,      │  │   multiplier,  │  │   entries,     │  │
│  │   bounds)      │  │   rentals)     │  │   ring buffer) │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security & On-Chain Logic

*   **Price Bounds:** Enforced `min_multiplier` (0.5x) and `max_multiplier` (3.0x).
*   **Cooldown:** Mandatory 60s cooldown between updates to prevent price manipulation.
*   **Oracle Validation:** Strict `Signer` validation for the authorized AI agent wallet.
*   **Audit Trail:** On-chain `PriceHistory` stores the last 10 entries with SHA-256 hashes of the AI reasoning.

---

## 📡 API Endpoints (AI Agent)

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | `/api/health`             | Liveness check                       |
| GET    | `/api/status`             | Wallet, program, uptime, counters    |
| GET    | `/api/current-analysis`   | Last decision + full history array   |
| POST   | `/api/simulate/:event`    | gpu_shortage, bull_run, low_demand   |
| POST   | `/api/trigger-update`     | Random market signal → AI → on-chain |

---

## 🗺️ Roadmap

- [x] **Premium Dashboard:** Real-time monitoring of AI price multipliers.
- [x] **Multi-Model Fallback:** Gemini + OpenAI integration.
- [x] **Escrow Rentals:** On-chain payment and withdrawal logic.
- [ ] **Real-Time Data Integration:** Live SOL/USD and GPU supply metrics.
- [ ] **Multi-Provider Support:** Permissionless provider registration.
- [ ] **Advanced Analytics:** Historical trend analysis and forecasting.

---

## 📜 License

ISC
