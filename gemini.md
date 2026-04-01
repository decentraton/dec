# Autonomous DePIN Pricing Network

> National Solana Hackathon 2025

---

## 0. Problem

Current DePIN networks use **static pricing**, leading to:

| Issue | Impact |
|-------|--------|
| No demand response | Providers lose revenue during high demand spikes |
| Manual price updates | Slow reaction to market changes (hours/days) |
| User overpaying | Static prices don't reflect low-demand periods |
| No market efficiency | Arbitrage opportunities lost |

**Example:** When NVIDIA announces new chips, GPU rental demand spikes 3x, but static-priced DePIN networks can't capture this value.

---

## 1. Solution

An **autonomous AI-powered pricing system** for DePIN that:

- Analyzes real-time market signals (news, token prices, network load)
- Generates price multipliers with transparent reasoning
- Updates on-chain prices without human intervention
- Protects against manipulation with security bounds

**Key Innovation:** AI Agent as a trusted oracle with explainable decisions stored on-chain.

---

## 2. Core Components

### 2.1. Solana Smart Contract (Anchor)

**Location:** `/programs/depin_pricing`

#### Account Structures

```rust
#[account]
pub struct ProviderConfig {
    pub owner: Pubkey,              // Provider wallet
    pub gpu_type: GpuType,          // A100, H100, RTX4090
    pub base_price: u64,            // Base price in lamports
    pub current_multiplier: u16,    // 100 = 1.0x, 150 = 1.5x
    pub last_updated: i64,          // Unix timestamp
    pub total_rentals: u64,         // Lifetime rental count
    pub is_active: bool,            // Provider status
}

#[account]
pub struct ProtocolConfig {
    pub admin: Pubkey,              // Protocol admin
    pub oracle: Pubkey,             // AI Agent pubkey (authorized)
    pub min_multiplier: u16,        // Floor: 50 (0.5x)
    pub max_multiplier: u16,        // Ceiling: 300 (3.0x)
    pub update_cooldown: i64,       // Min seconds between updates
}

#[account]
pub struct PriceHistory {
    pub provider: Pubkey,
    pub entries: [PriceEntry; 10],  // Last 10 price changes
    pub current_index: u8,
}

pub struct PriceEntry {
    pub multiplier: u16,
    pub timestamp: i64,
    pub reasoning_hash: [u8; 32],   // SHA256 of AI reasoning
}
```

#### Enums

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum GpuType {
    A100,
    H100,
    RTX4090,
}
```

#### Instructions

| Instruction | Access | Description |
|-------------|--------|-------------|
| `initialize_protocol` | Admin | Set oracle pubkey, price bounds |
| `initialize_provider` | Anyone | Register GPU with base price |
| `update_multiplier` | Oracle only | AI updates price multiplier |
| `rent_hardware` | Anyone | Pay `(base_price * multiplier) / 100` |
| `withdraw_earnings` | Provider | Claim rental revenue |
| `update_oracle` | Admin | Change authorized AI agent |

#### Events

```rust
#[event]
pub struct MultiplierUpdated {
    pub provider: Pubkey,
    pub old_multiplier: u16,
    pub new_multiplier: u16,
    pub reasoning_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct HardwareRented {
    pub provider: Pubkey,
    pub renter: Pubkey,
    pub final_price: u64,
    pub duration_hours: u16,
    pub gpu_type: GpuType,
}
```

#### Security

- **Price Bounds:** Min 0.5x, Max 3.0x (configurable)
- **Oracle Restriction:** Only authorized AI Agent can update prices
- **Cooldown:** Minimum 60 seconds between updates
- **Reasoning Hash:** On-chain proof of AI decision

---

### 2.2. Off-Chain AI Agent (TypeScript)

**Location:** `/ai-agent`

#### Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Fetch Data  │ ──▶ │  2. AI Analysis │ ──▶ │ 3. Sign TX      │ ──▶ │ 4. Submit TX    │
│  (APIs, News)   │     │  (Gemini 2.0)   │     │ (Oracle Wallet) │     │ (Helius RPC)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Data Sources

| Source | Data | Usage |
|--------|------|-------|
| CoinGecko API | RNDR, HNT, AKT prices | Market sentiment |
| News API | GPU/AI headlines | Demand prediction |
| Mock Network API | GPU utilization % | Load factor |
| Twitter/X (optional) | Sentiment analysis | Hype detection |

#### Multiplier Calculation

```typescript
const calculateMultiplier = (signals: MarketSignals): number => {
  const weights = {
    news_sentiment: 0.3,    // -1 to +1
    token_price_change: 0.3, // % change 24h
    network_load: 0.25,      // 0 to 1
    time_of_day: 0.15,       // peak hours factor
  };
  
  const raw_score = 
    signals.news_sentiment * weights.news_sentiment +
    signals.token_change * weights.token_price_change +
    signals.network_load * weights.network_load +
    signals.peak_factor * weights.time_of_day;
  
  // Map to 50-300 range (0.5x to 3.0x)
  return Math.round(Math.max(50, Math.min(300, 100 + raw_score * 100)));
};
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Agent status |
| `GET` | `/api/current-analysis` | Last reasoning + score |
| `POST` | `/api/trigger-update` | Manual trigger |
| `POST` | `/api/simulate/:event` | Demo events (shortage, bull_run) |

#### Simulation Events (for Demo)

```typescript
const DEMO_EVENTS = {
  gpu_shortage: {
    news: "NVIDIA reports Q4 chip shortage affecting data centers",
    sentiment: 0.8,
    multiplier: 250, // 2.5x
  },
  bull_run: {
    news: "Bitcoin breaks $150k, AI tokens surge 40%",
    sentiment: 0.6,
    multiplier: 200, // 2.0x
  },
  low_demand: {
    news: "Market correction: Tech stocks down 15%",
    sentiment: -0.4,
    multiplier: 70, // 0.7x
  },
};
```

---

### 2.3. Frontend Dashboard (Next.js)

**Location:** `/app`

#### Features

| Feature | Description |
|---------|-------------|
| **Live Pricing Board** | All GPUs with real-time prices, auto-refresh |
| **Price History Chart** | Last 10 price changes (Recharts) |
| **AI Reasoning Panel** | LLM explanation of last decision |
| **Simulator Buttons** | "GPU Shortage", "Bull Run", "Low Demand" |
| **Transaction Status** | Pending -> Confirmed with Explorer link |
| **Wallet Connection** | Phantom adapter for Devnet |

#### UI Components

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Logo + Wallet Connect                               │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌────────────────────────────┐  │
│  │  GPU Pricing Cards     │  │  AI Reasoning Panel        │  │
│  │  - A100: $2.50/hr      │  │  "Demand increased due to  │  │
│  │  - H100: $4.20/hr      │  │   NVIDIA announcement..."  │  │
│  │  - RTX4090: $1.10/hr   │  │                            │  │
│  │  [Rent] buttons        │  │  Confidence: 87%           │  │
│  └────────────────────────┘  └────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  Price History Chart (Recharts line graph)                   │
├──────────────────────────────────────────────────────────────┤
│  Demo Controls: [GPU Shortage] [Bull Run] [Low Demand]       │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Smart Contract | Rust, Anchor | 0.30.1 |
| Blockchain | Solana | Devnet |
| AI Agent | TypeScript, Node.js | 20.x |
| LLM | Google Gemini 2.0 Flash | Latest |
| Gemini SDK | @google/generative-ai | 0.21.x |
| Solana SDK | @solana/web3.js | 1.x |
| RPC Provider | Helius | Devnet |
| Frontend | Next.js | 15.x |
| Styling | TailwindCSS | 4.x |
| Charts | Recharts | 2.x |
| Wallet | @solana/wallet-adapter | Latest |

---

## 4. Demo Flow (for Judges)

```
1. [Dashboard loads] 
   → Show current GPU prices: A100 = $2.00/hr (1.0x multiplier)

2. [Click "Trigger GPU Shortage"]
   → Frontend calls POST /api/simulate/gpu_shortage

3. [AI Agent processes]
   → Fetches mock news: "NVIDIA chip shortage"
   → Gemini 2.0 Flash generates reasoning + 2.5x multiplier
   → Signs and submits transaction

4. [On-chain update]
   → Show Solana Explorer transaction link
   → MultiplierUpdated event emitted

5. [Dashboard updates]
   → A100 price changes: $2.00 → $5.00/hr
   → AI Reasoning panel shows explanation
   → Price history chart adds new point

6. [Rent GPU]
   → Connect Phantom wallet
   → Click "Rent A100 for 1 hour"
   → Pay 5.00 USDC equivalent
   → HardwareRented event emitted
```

---

## 5. Environment Variables

```env
# Solana
HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=xxx
ORACLE_PRIVATE_KEY=base58_encoded_private_key
PROGRAM_ID=your_deployed_program_id

# AI
GEMINI_API_KEY=your_gemini_api_key

# Frontend
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=xxx
NEXT_PUBLIC_PROGRAM_ID=your_deployed_program_id

# Optional: Real data sources
COINGECKO_API_KEY=xxx
NEWS_API_KEY=xxx
```

---

## 6. Project Structure

```
/
├── programs/
│   └── depin_pricing/
│       ├── src/
│       │   ├── lib.rs
│       │   ├── state.rs
│       │   ├── instructions/
│       │   │   ├── initialize.rs
│       │   │   ├── update_multiplier.rs
│       │   │   └── rent_hardware.rs
│       │   └── errors.rs
│       └── Cargo.toml
│
├── ai-agent/
│   ├── src/
│   │   ├── index.ts
│   │   ├── analyzer.ts
│   │   ├── solana-client.ts
│   │   └── mock-data.ts
│   └── package.json
│
├── app/                        # Next.js frontend
│   ├── page.tsx
│   ├── api/
│   │   ├── trigger-update/route.ts
│   │   └── simulate/[event]/route.ts
│   └── components/
│       ├── pricing-board.tsx
│       ├── ai-reasoning.tsx
│       ├── price-chart.tsx
│       └── demo-controls.tsx
│
├── tests/
│   └── depin_pricing.ts
│
└── docs/
    └── gemini.md               # This file
```

---

## 7. Future Roadmap

| Phase | Features |
|-------|----------|
| **v1.1** | Multiple oracle consensus (3-of-5 AI agents) |
| **v1.2** | Real-time data feeds (Pyth, Switchboard) |
| **v1.3** | Provider reputation system (uptime, quality) |
| **v2.0** | Cross-chain pricing (Ethereum L2s via Wormhole) |
| **v2.1** | Predictive pricing (forecast next 24h) |
| **v2.2** | Auction-based pricing for premium GPUs |

---

## 8. Evaluation Criteria Mapping

| Criteria | How We Address It |
|----------|-------------------|
| **Product & Idea (20)** | Solves real DePIN pricing inefficiency |
| **Use of Solana (15)** | Native Anchor program, Devnet deployment |
| **Innovation (15)** | AI oracle with explainable on-chain reasoning |
| **Code Quality (15)** | Modular architecture, typed contracts |
| **Demo (10)** | Interactive simulator with live blockchain |
| **Real-World Use Case (bonus)** | Infrastructure/Finance category |
