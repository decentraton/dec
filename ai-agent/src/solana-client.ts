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
    const IDL_PATH = path.resolve(__dirname, "./idl.json");
    
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
      [Buffer.from("protocol_config")],
      PROGRAM_ID
    );
    const [providerConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("provider"), oracleKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );
    const [priceHistoryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("price_history"), oracleKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );

    try {
        const tx = await program.methods
            .updateMultiplier(multiplier, reasoningHash)
            .accounts({
                providerConfig: providerConfigPda,
                priceHistory: priceHistoryPda,
                protocolConfig: protocolConfigPda,
                oracle: oracleKeypair.publicKey,
            })
            // .signers([oracleKeypair]) is handled by provider Wallet
            .rpc();

        console.log(`[TX] ✅ https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        return tx;
    } catch(err: any) {
        console.error("[TX] ❌ Failed: ", err.message?.slice(0, 300));
        return null;
    }
}
