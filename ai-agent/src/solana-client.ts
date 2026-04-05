import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";
import * as os from "os";

import * as bs58 from "bs58";

export const PROGRAM_ID = new PublicKey("HCvBL7SYEyHX82gLENzoD2DUSogqqyEcX3og3upBHSJ1");

export function initSolanaClient(rpcUrl: string) {
    // @ts-ignore - import.meta.dirname exists in Node 20.11+
    const IDL_PATH = path.resolve(import.meta.dirname, "./idl.json");
    
    let oracleKeypair: Keypair;
    const envKey = process.env.ORACLE_PRIVATE_KEY?.trim();
    
    if (envKey) {
        try {
            let secret: Uint8Array;
            if (envKey.startsWith("[") && envKey.endsWith("]")) {
                // JSON Array format
                secret = Uint8Array.from(JSON.parse(envKey));
            } else if (envKey.length >= 87) {
                // Base58 format (standard for Solana)
                // Use default import if available or standard bs58 decode
                // @ts-ignore
                secret = (bs58.default || bs58).decode(envKey);
            } else {
                // Try Hex if shorter but valid hex
                secret = Uint8Array.from(Buffer.from(envKey, "hex"));
            }
            
            oracleKeypair = Keypair.fromSecretKey(secret);
            console.log(`[INIT] Success! Oracle: ${oracleKeypair.publicKey.toBase58()}`);
        } catch (err: any) {
            console.error(`[INIT] ❌ Failed to parse ORACLE_PRIVATE_KEY: ${err.message}`);
            return { connection: new Connection(rpcUrl), oracleKeypair: Keypair.generate(), program: null };
        }
    } else {
        const WALLET_PATH = path.join(os.homedir(), ".config/solana/id.json");
        if (!fs.existsSync(WALLET_PATH)) {
            console.warn(`[WARN] Wallet not found at ${WALLET_PATH}. Generate fake keypair.`);
            return { connection: new Connection(rpcUrl), oracleKeypair: Keypair.generate(), program: null };
        }
        const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8")));
        oracleKeypair = Keypair.fromSecretKey(secretKey);
    }

    const connection = new Connection(rpcUrl, "confirmed");
    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(oracleKeypair),
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);

    let idl = null;
    try {
        idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
    } catch (err) {
        console.warn("[WARN] Could not load compiled Anchor IDL.");
    }

    const program = idl ? new Program(idl, provider) : null;
    return { connection, oracleKeypair, program };
}

export async function updateOnChain(program: any, oracleKeypair: Keypair, multiplier: number, reasoning: string) {
    if (!program) {
        console.warn("[TX] Anchor Program not initialized. Transaction skipped.");
        return null;
    }
    
    console.log(`[TX] Multiplier → ${multiplier / 100}x | ${reasoning}`);

    const reasoningHash = Array.from(crypto.createHash("sha256").update(reasoning).digest());
    
    const [protocolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_cfg_v1")],
      PROGRAM_ID
    );
    const [providerConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("provider_v1"), oracleKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );
    const [priceHistoryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("history_v1"), oracleKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );

    try {
        const tx = await program.methods
            .updateMultiplier(multiplier, 50, reasoningHash)
            .accounts({
                providerConfig: providerConfigPda,
                priceHistory: priceHistoryPda,
                protocolConfig: protocolConfigPda,
                oracle: oracleKeypair.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        console.log(`[ TX ] [ SUCCESS ] https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        return tx;
    } catch(err: any) {
        if (err.message?.includes("6002") || err.message?.includes("CooldownNotElapsed")) {
            console.error(`\n####################################################################`);
            console.error(`# [ BLOCKCHAIN ] [ !! ] COOLDOWN ACTIVE`);
            console.error(`# Error: CooldownNotElapsed (6002)`);
            console.error(`# The protocol is protecting against spam. Please wait ~60s.`);
            console.error(`####################################################################\n`);
        } else {
            console.error("[ TX ] [ ERROR ] Failed: ", err.message?.slice(0, 300));
        }
        return null;
    }
}

export async function syncOnChainStats(program: any, oraclePubKey: PublicKey) {
    if (!program) return { totalUpdates: 0, history: [], multiplier: 1.0 };

    const [protocolConfigPda] = PublicKey.findProgramAddressSync([Buffer.from("protocol_cfg_v1")], PROGRAM_ID);
    const [providerConfigPda] = PublicKey.findProgramAddressSync([Buffer.from("provider_v1"), oraclePubKey.toBuffer()], PROGRAM_ID);
    const [priceHistoryPda] = PublicKey.findProgramAddressSync([Buffer.from("history_v1"), oraclePubKey.toBuffer()], PROGRAM_ID);

    try {
        console.log("[SYNC] 🔄 Pulling on-chain state...");
        
        // 1. Get total transaction count for the program (paginate to bypass 1000-sig RPC cap)
        let allSignatures: any[] = [];
        let before: string | undefined = undefined;
        while (true) {
            const batch = await program.provider.connection.getSignaturesForAddress(
                PROGRAM_ID,
                { limit: 1000, ...(before ? { before } : {}) }
            );
            if (batch.length === 0) break;
            allSignatures = allSignatures.concat(batch);
            if (batch.length < 1000) break; // last page
            before = batch[batch.length - 1].signature;
        }
        const updateCount = allSignatures.filter((s: any) => !s.err).length;

        // 2. Fetch the current provider config and history
        const [providerAcc, historyAcc] = await Promise.all([
            program.account.providerConfig.fetch(providerConfigPda),
            program.account.priceHistory.fetch(priceHistoryPda)
        ]);

        // 3. Map circular buffer to chronological order
        const rawEntries = historyAcc.entries as any[];
        const sortedHistory = rawEntries
            .filter(e => e.timestamp.toNumber() > 0)
            .sort((a, b) => a.timestamp.toNumber() - b.timestamp.toNumber());

        console.log(`[SYNC] ✅ Found ${updateCount} updates on-chain. Multiplier: ${providerAcc.currentMultiplier / 100}x`);

        return {
            totalUpdates: updateCount,
            multiplier: providerAcc.currentMultiplier / 100,
            history: sortedHistory.map(e => ({
                multiplier: e.multiplier / 100,
                reasoning: "On-chain history entry",
                reasoningHash: Buffer.from(e.reasoningHash).toString("hex"),
                timestamp: e.timestamp.toNumber() * 1000,
                txSignature: "RESTORED",
                confidence: e.confidence || 75
            }))
        };
    } catch (err: any) {
        console.warn("[SYNC] ⚠️  Skipping on-chain sync (accounts might not be initialized):", err.message);
        return { totalUpdates: 0, history: [], multiplier: 1.0 };
    }
}
