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

### 📌 Tested Environment & Precise Versions
To guarantee a successful build, ensure your environment strictly matches these versions:
*   **Rust & Cargo:** `v1.75.0` (required due to feature differences in newer Rust compilers)
*   **Solana CLI:** `v1.18.26`
*   **Anchor CLI:** `v0.30.1` (with `proc-macro2` pinned to `1.0.86`)
*   **Node.js:** `v20.x+` (NPM overrides required for frontend)
*   **Next.js:** `v15.5.14` | **React:** `v19.1.0`

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

### 1. Environment & Global Setup
Clone the repository and create `.env` in the project root:
```env
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=xxx
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key  # optional fallback
ORACLE_PRIVATE_KEY="[24,186,105, ...]" # exported from your id.json
```
Install strictly `Rust 1.75.0`:
```bash
rustup default 1.75.0
```

### 2. Deploy Smart Contract
Sync the keys to generate a new Program ID, then build and deploy to Devnet.
```bash
anchor keys sync
anchor build
anchor deploy --provider.cluster devnet
```
*Note: Update the new Program ID in `ai-agent/src/initialize.ts` and `ai-agent/src/solana-client.ts` after deployment.*

### 3. Initialize & Start AI Agent
```bash
cd ai-agent
npm install
npm run init   # Creates ProtocolConfig + ProviderConfig PDAs
npm run start  # Starts Express API on http://localhost:3001
```

### 4. Start Frontend
Use `--legacy-peer-deps` due to React 19 peer dependencies:
```bash
cd app
npm install --legacy-peer-deps
npm run dev    # Next.js on http://localhost:3000
```

---

## 🔧 Troubleshooting & Known Errors

If you run into issues putting this on a new machine, refer to these common compilation/setup errors:

**1. `no method named source_file found for struct proc_macro2::Span`**
*   **Cause:** Anchor 0.30.1 IDL generation breaks with `proc-macro2 >= 1.0.89` because the configuration flag was deprecated.
*   **Fix:** Downgrade the dependencies manually via Cargo to compatible versions before building:
    ```bash
    cargo update -p syn@2 --precise 2.0.79
    cargo update -p proc-macro2@1 --precise 1.0.86
    ```

**2. Frontend NPM Install Fails with 404 for `plain-crypto-js`**
*   **Cause:** The package `plain-crypto-js-4.2.1.tgz` was recently taken down from the NPM Registry, breaking downstream wallet-adapter SDKs.
*   **Fix:** Add an `overrides` block inside `app/package.json`:
    ```json
    "overrides": {
      "plain-crypto-js": "npm:crypto-js@4.2.0"
    }
    ```
    Then remove `package-lock.json` and reinstall `npm install --legacy-peer-deps`.

**3. `UnauthorizedOracle` (Error Code: 6000) during Agent execution**
*   **Cause:** The Protocol is completely isolated. If you didn't execute `npm run init` with your specific wallet, or if you're hitting an old Program ID, the contract rejects the price update.
*   **Fix:** Ensure you performed `anchor keys sync` to use your own Program ID, rebuilt, redeployed, and ran `npm run init` using a wallet backed by your `ORACLE_PRIVATE_KEY`.

**4. Rate Limiting on Devnet Airdrops**
*   **Cause:** `solana airdrop 1` frequently encounters IP limits on official endpoint limits.
*   **Fix:** Use web faucets (e.g., Faucet.solana.com, Quicknode) or extract an existing funded keypair from `~/.config/solana/*.json` using the command `cat ~/.config/solana/id.json`.

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
