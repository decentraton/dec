/**
 * One-time script to initialize on-chain state (ProtocolConfig + ProviderConfig + PriceHistory).
 * Run via: node --loader ts-node/esm src/initialize.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import dotenv from "dotenv";

// Load .env from project root or ai-agent root
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const PROGRAM_ID = new PublicKey("7yErp5yo4oE3SoQrz83Z9q97uBYJ5am4eLE4VRmpgmZB");
const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";
const IDL_PATH = path.resolve(process.cwd(), "../target/idl/depin_pricing.json");
const WALLET_PATH = path.join(os.homedir(), ".config/solana/id.json");

if (!fs.existsSync(WALLET_PATH)) {
    console.error(`❌ Wallet not found at ${WALLET_PATH}`);
    console.error("   Run: solana-keygen new");
    process.exit(1);
}

const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8")));
const wallet = Keypair.fromSecretKey(secretKey);
const connection = new Connection(RPC_URL, "confirmed");
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
anchor.setProvider(provider);

const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8")) as anchor.Idl;
const program = new Program(idl, provider);

async function main() {
    console.log("═".repeat(60));
    console.log("  DePIN Pricing — On-Chain Initialization");
    console.log("═".repeat(60));
    console.log(`  Program:  ${PROGRAM_ID.toBase58()}`);
    console.log(`  Wallet:   ${wallet.publicKey.toBase58()}`);
    console.log(`  RPC:      ${RPC_URL}`);
    console.log();

    const [protocolConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("protocol_config")], PROGRAM_ID
    );
    const [providerConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("provider"), wallet.publicKey.toBuffer()], PROGRAM_ID
    );
    const [priceHistoryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("price_history"), wallet.publicKey.toBuffer()], PROGRAM_ID
    );

    console.log("  PDA protocolConfig:", protocolConfigPda.toBase58());
    console.log("  PDA providerConfig:", providerConfigPda.toBase58());
    console.log("  PDA priceHistory:  ", priceHistoryPda.toBase58());
    console.log();

    // 1. Initialize Protocol
    try {
        console.log("1. Initializing Protocol...");
        const tx1 = await program.methods
            .initializeProtocol(wallet.publicKey, 50, 300, new BN(60))
            .accounts({
                protocolConfig: protocolConfigPda,
                admin: wallet.publicKey,
                systemProgram: SystemProgram.programId,
            } as any)
            .rpc();
        console.log("   ✅ Protocol Config TX:", tx1);
    } catch (e: any) {
        if (e.message?.includes("already in use")) {
            console.log("   ⏭  Protocol Config already initialized, skipping.");
        } else {
            console.log("   ⚠️  Protocol Init:", e.message?.slice(0, 200));
        }
    }

    // 2. Initialize Provider (H100, 2 SOL base price)
    try {
        console.log("2. Initializing H100 Provider...");
        const tx2 = await program.methods
            .initializeProvider({ h100: {} }, new BN(2_000_000_000))
            .accounts({
                providerConfig: providerConfigPda,
                priceHistory: priceHistoryPda,
                owner: wallet.publicKey,
                systemProgram: SystemProgram.programId,
            } as any)
            .rpc();
        console.log("   ✅ Provider Init TX:", tx2);
    } catch (e: any) {
        if (e.message?.includes("already in use")) {
            console.log("   ⏭  Provider Config already initialized, skipping.");
        } else {
            console.log("   ⚠️  Provider Init:", e.message?.slice(0, 200));
        }
    }

    console.log("\n✅ Done. You can now start the AI Agent server.\n");
}

main().catch(console.error);
