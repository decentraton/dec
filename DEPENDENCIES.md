# Project Dependencies Manifest

Summary of all core technologies, libraries, and their versions used in the DePIN AI Pricing Oracle project.

## 🤖 AI Agent (Backend)
Located in `/ai-agent`
- **Node.js**: `22.x` (Target)
- **TypeScript**: `^6.0.2`
- **Express**: `^4.21.2`
- **Solana Web3 SDK**: `^1.98.4`
- **Anchor Client (Coral)**: `^0.30.1`
- **Google Gemini SDK**: `^0.24.1`
- **OpenAI SDK**: `^6.33.0`
- **Others**: `cors`, `dotenv`, `bs58`, `bn.js`

## 💻 Dashboard (Frontend)
Located in `/app`
- **Next.js**: `15.5.14` (with Turbopack)
- **React**: `19.1.0`
- **Solana Wallet Adapter**: `^0.9.x` / `^0.15.x`
- **Recharts**: `^2.15.0` (for market charts)
- **Lucide React**: `^0.471.0` (icons)
- **Tailwind CSS**: `^4`

## 🦀 Smart Contract (Rust)
Located in `/programs/depin_pricing`
- **Rust Version**: `1.75.0` (Strict requirement for SBF)
- **Anchor Framework**: `0.30.1` (Unified Client/Contract)
- **Edition**: `2021`
- **Borsh**: `1.5.1` (Pinned for Rust 1.75 compatibility)

### 🗡️ Iron Lock (Local Patches in `/deps`)
These libraries are manually patched to bypass the `edition 2024` build crisis:
- **`blake3`**: `1.5.5` (Last Rust 2021 stable)
- **`block-buffer`**: `0.10.4`
- **`subtle`**: `2.5.0`
- **`digest`**: `0.10.7`
- **`constant_time_eq`**: `0.3.0`
- **`cpufeatures`**: `0.2.9`
- **`crypto-common`**: `0.1.6`
- **`cmov`**: `0.5.1`

### 🔧 Critical Rust Pins (Cargo.lock)
- **`proc-macro2`**: `1.0.106` (with `span-locations` feature)
- **`syn`**: `2.0.117`
- **`getrandom`**: `0.2.17`

## 🔧 Infrastructure & Tooling
- **RPC Provider**: Helius (Solana Devnet)
- **Deployment**: Render.com (Blueprint deployment)
- **AI Models**: 
  - `gemini-2.5-flash-lite` (Primary)
  - `gpt-4o-mini` (Fallback)
