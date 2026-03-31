import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";
import * as os from "os";

export const PROGRAM_ID = new PublicKey("7yErp5yo4oE3SoQrz83Z9q97uBYJ5am4eLE4VRmpgmZB");

export function initSolanaClient(rpcUrl: string) {
    const IDL_PATH = path.resolve(process.cwd(), "../target/idl/depin_pricing.json");
    const WALLET_PATH = path.join(os.homedir(), ".config/solana/id.json");

    if (!fs.existsSync(WALLET_PATH)) {
        console.warn(`[WARN] Wallet not found at ${WALLET_PATH}. Fake keypair initialized for dev.`);
        return { 
           connection: new Connection(rpcUrl), 
           oracleKeypair: Keypair.generate(), 
           program: null 
        };
    }

    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8")));
    const oracleKeypair = Keypair.fromSecretKey(secretKey);

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
