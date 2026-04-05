# Autonomous DePIN Pricing Oracle (Solana + Gemini AI)

AI-powered dynamic pricing oracle for DePIN GPU compute networks, built on Solana. The protocol autonomously adjusts price multipliers every 60 seconds based on real-time market signals using Google Gemini AI, recording every decision on-chain with SHA-256 proof.

🔗 **Live Demo:** [https://depin-pricing-app.onrender.com/](https://depin-pricing-app.onrender.com/) | **Program:** [`HCvBL7…BHSJ1`](https://explorer.solana.com/address/HCvBL7SYEyHX82gLENzoD2DUSogqqyEcX3og3upBHSJ1?cluster=devnet)

---

## 🚀 Key Features

- **Autonomous AI Oracle** — Gemini AI sets GPU prices every 60 s. No human interaction required.
- **Multi-Model Fallback Chain** — `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash` → `gpt-4o-mini`. Always resilient.
- **On-Chain Proof** — Every AI decision is SHA-256 hashed and stored in `PriceHistory` PDA on Solana Devnet.
- **Real-Time Dashboard** — Premium Next.js UI with live charts, KPI metrics, and GPU marketplace.
- **Wallet Rentals** — Phantom/Solflare wallet integration for actual GPU rental transactions on Devnet.
- **Market Simulator** — Trigger GPU shortage, bull run, or low demand scenarios to see AI react in real time.

---

## 🛠️ Project Structure

```
/programs/depin_pricing   — Rust · Anchor 0.30.1 smart contract
/ai-agent                 — Node.js autonomous pricing agent (Express :3001)
/app                      — Next.js 15 + Tailwind dashboard (:3000)
/target/idl               — Anchor IDL for off-chain integration
```

---

## 📋 Versions & Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Rust | `1.75.0` | Must be exact — newer versions break Anchor IDL gen |
| Solana CLI | `1.18.26` | |
| Anchor CLI | `0.30.1` | with `proc-macro2` pinned to `1.0.86` |
| Node.js | `20.x+` | |
| Next.js | `15.5.14` | |
| React | `19.1.0` | |

---

## ⚡ Quick Start

> **⚠️ Both the AI Agent (`:3001`) and Frontend (`:3000`) must run on the same machine.**

### 1. Clone & Configure

```bash
git clone https://github.com/decentraton/dec.git
cd dec
```

Create `.env` in the **project root**:

```env
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
GEMINI_API_KEY=YOUR_GEMINI_KEY         # required — get free key at aistudio.google.com
OPENAI_API_KEY=YOUR_OPENAI_KEY         # optional fallback
ORACLE_PRIVATE_KEY="[24,186,105,...]"  # your Solana keypair as JSON array
```

> **⚡ Tip:** Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com). Use `gemini-2.5-flash` or `gemini-2.5-flash-lite` — both work on the free tier.

Lock Rust to the required version:

```bash
rustup default 1.75.0
```

### 2. Deploy Smart Contract

```bash
anchor keys sync
anchor build
anchor deploy --provider.cluster devnet
```

> After deploy, update the new Program ID in:
> - `ai-agent/src/initialize.ts`
> - `ai-agent/src/solana-client.ts`

### 3. Initialize PDAs

```bash
cd ai-agent
npm install
npm run init   # Creates ProtocolConfig + ProviderConfig PDAs on Devnet
```

### 4. Start AI Agent

```bash
npm run start  # Express API on http://localhost:3001
```

Or pass env variables explicitly (if dotenv doesn't load):

```bash
GEMINI_API_KEY="your-key" \
HELIUS_RPC_URL="https://devnet.helius-rpc.com/?api-key=xxx" \
ORACLE_PRIVATE_KEY="[...]" \
npm run start
```

### 5. Start Frontend

```bash
cd ../app
npm install --legacy-peer-deps
npm run dev    # Next.js on http://localhost:3000
```

---

## 🤖 AI Pricing Engine

The analyzer (`ai-agent/src/analyzer.ts`) implements a **4-level fallback chain**:

```
gemini-2.5-flash (v1beta)
    ↓ on error
gemini-2.5-flash-lite (v1beta)
    ↓ on error
gemini-2.0-flash (v1)
    ↓ on error
gpt-4o-mini (OpenAI)
    ↓ on error
Market-aware baseline (SOL price signal)
```

Each model receives real market signals and responds with:
```json
{ "multiplier": 1.25, "reasoning": "High GPU demand due to AI training surge." }
```

The multiplier is then:
1. Validated to range `0.50–3.00×`
2. Scaled `× 100` → `125` for the Anchor instruction
3. Written on-chain with a SHA-256 hash of the AI reasoning
4. Reflected in GPU rental prices across all providers

### Example AI decisions (from live agent logs):
```
gemini-2.5-flash-lite → 0.90× — "Increased AWS GPU supply → slight discount"
gemini-2.5-flash-lite → 1.25× — "Steady AI training demand → slight premium"
gemini-2.5-flash-lite → 2.50× — "NVIDIA H100 shortage + bullish SOL → premium"
```

---

## 🏗️ Architecture

```
┌──────────────┐     REST API calls          ┌──────────────┐
│   Next.js    │ ────────────────────────▶   │  AI Agent    │
│   Frontend   │ ◀──────────────────────── │ │  (Express)   │
│   (:3000)    │     JSON with analysis      │  (:3001)     │
└──────────────┘                             └──────┬───────┘
       │                                            │
       │  Phantom/Solflare                  Gemini AI REST
       │  Wallet Adapter                    updateMultiplier
       ▼                                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Solana Devnet                           │
│  ProtocolConfig PDA │ ProviderConfig PDA │ PriceHistory PDA  │
│  (bounds, oracle)   │ (multiplier, rent) │ (last 10 entries) │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/status` | Wallet, uptime, update count, program status |
| `GET` | `/api/current-analysis` | Latest AI decision + history array |
| `GET` | `/api/providers` | GPU nodes with dynamic pricing |
| `GET` | `/api/sol-price` | Live SOL/USD from CoinGecko |
| `GET` | `/api/network-stats` | Solana TPS and network metrics |
| `POST` | `/api/simulate/:event` | `gpu_shortage` · `bull_run` · `low_demand` |
| `POST` | `/api/trigger-update` | Trigger organic AI update now |

---

## 🛡️ On-Chain Security

| Rule | Detail |
|------|--------|
| **Price Bounds** | Smart contract enforces `min_multiplier=50` (`0.5×`) and `max_multiplier=300` (`3.0×`) |
| **Cooldown** | 60 s mandatory cooldown between `updateMultiplier` calls — prevents manipulation |
| **Oracle Auth** | Only the wallet matching `ORACLE_PRIVATE_KEY` can update — strict `Signer` check |
| **Audit Trail** | `PriceHistory` ring buffer stores last 10 decisions with SHA-256 reasoning hash |

---

## 🔧 Troubleshooting

### ❌ `no method named source_file found for proc_macro2::Span`
Anchor 0.30.1 breaks with newer `proc-macro2`. Fix:
```bash
cargo update -p syn@2 --precise 2.0.79
cargo update -p proc-macro2@1 --precise 1.0.86
```

### ❌ Frontend install fails — `plain-crypto-js` 404
Add to `app/package.json`:
```json
"overrides": { "plain-crypto-js": "npm:crypto-js@4.2.0" }
```
Then: `rm package-lock.json && npm install --legacy-peer-deps`

### ❌ `UnauthorizedOracle` (Error 6000)
The contract only accepts updates from the authorized oracle wallet. Ensure:
1. You ran `npm run init` with your specific keypair
2. `ORACLE_PRIVATE_KEY` in `.env` matches the wallet used during init
3. Program ID is up to date after `anchor deploy`

### ❌ `PriceOutOfBounds` (Error 6001)
The on-chain multiplier must be in range 50–300 (i.e. 0.5×–3.0×).
The agent now correctly scales: `1.25 × 100 = 125` before sending on-chain.

### ❌ `CooldownNotElapsed` (Error 6002)
Normal — the contract enforces 60 s between updates. Wait and retry.

### ❌ Gemini returns 403 / 429
- **403**: Use `v1beta` endpoint for `gemini-2.5-*` models (the agent does this automatically)
- **429**: Quota exceeded — get a new API key free at [aistudio.google.com](https://aistudio.google.com)
- Agent automatically tries `gemini-2.5-flash-lite` as fallback

### ❌ Agent reads empty env vars (dotenv logs "injecting 0")
Pass env variables directly when starting:
```bash
GEMINI_API_KEY="your-key" HELIUS_RPC_URL="..." ORACLE_PRIVATE_KEY="[...]" npm run start
```

### ❌ Devnet airdrop rate limited
Use web faucets: [faucet.solana.com](https://faucet.solana.com) or [quicknode.com/faucet](https://quicknode.com/faucet/)

---

## 🎨 Frontend Design System

The dashboard uses the **"Devtools Luxe"** design language:

| Element | Detail |
|---------|--------|
| **Display font** | [Geist](https://vercel.com/font) — Vercel's 2023 font, superior readability |
| **Data font** | [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — #1 developer mono, all prices/hashes |
| **Base color** | `#080c10` deep space dark |
| **Accent** | `#b8ff3c` acid green — single punchy color for live data |
| **Base font size** | `16px` — industry standard, fully readable |
| **Animation** | Framer-free: CSS `@keyframes rise` reveal, live-dot pulse, scan sweep |
| **Accessibility** | WCAG 2.1 AA — `aria-label`, `role`, `aria-live`, skip links, `focus-visible` |

---

## 🗺️ Roadmap

- [x] Autonomous AI Oracle (Gemini + fallback chain)
- [x] On-chain multiplier with SHA-256 audit trail
- [x] Premium dashboard (Geist font, KPI bar, dual-axis chart)
- [x] GPU Marketplace with Phantom/Solflare wallet rentals
- [x] Market Simulator (GPU shortage / bull run / low demand)
- [x] Auto-update toggle with countdown (45 s loop)
- [ ] Mainnet Beta deployment
- [ ] Permissionless provider registration
- [ ] Historical GPU utilization analytics
- [ ] Server-side rental fee verification

---

## 📜 License

ISC
