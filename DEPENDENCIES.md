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
- **Rust Version**: `1.75.0` (Strict requirement)
- **Anchor Framework**: `0.31.0` (Contract side) / `0.30.1` (Client side)
- **Edition**: `2021`

### 🔧 Critical Rust Pins (Cargo.lock)
These versions are locked to ensure build stability with Anchor:
- **`proc-macro2`**: `1.0.106`
- **`syn`**: `2.0.117`
- **`getrandom`**: `0.2.17`
- **`rand`**: `0.8.5`

## 🔧 Infrastructure & Tooling
- **RPC Provider**: Helius (Solana Devnet)
- **Deployment**: Render.com (Blueprint deployment)
- **AI Models**: 
  - `gemini-2.5-flash-lite` (Primary)
  - `gpt-4o-mini` (Fallback)
