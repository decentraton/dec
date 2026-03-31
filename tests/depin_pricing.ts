import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DepinPricing } from "../target/types/depin_pricing";
import { assert } from "chai";

describe("depin_pricing", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DepinPricing as Program<DepinPricing>;
  
  const admin = anchor.web3.Keypair.generate();
  const oracle = anchor.web3.Keypair.generate();
  const providerOwner = anchor.web3.Keypair.generate();
  const renter = anchor.web3.Keypair.generate();

  let protocolConfigPda: anchor.web3.PublicKey;
  let providerConfigPda: anchor.web3.PublicKey;
  let priceHistoryPda: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop SOL to test accounts
    const airdropPromises = [admin, oracle, providerOwner, renter].map(async (keypair) => {
      const sig = await provider.connection.requestAirdrop(keypair.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        signature: sig,
        ...latestBlockhash,
      });
    });
    await Promise.all(airdropPromises);

    [protocolConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_config")],
      program.programId
    );

    [providerConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("provider"), providerOwner.publicKey.toBuffer()],
      program.programId
    );

    [priceHistoryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("price_history"), providerOwner.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Is initialized!", async () => {
    const minMultiplier = 50; // 0.5x
    const maxMultiplier = 300; // 3.0x
    const cooldown = new anchor.BN(60); // 60 seconds

    const tx = await program.methods
      .initializeProtocol(oracle.publicKey, minMultiplier, maxMultiplier, cooldown)
      .accounts({
        protocolConfig: protocolConfigPda,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();
    
    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    assert.strictEqual(config.admin.toBase58(), admin.publicKey.toBase58());
    assert.strictEqual(config.oracle.toBase58(), oracle.publicKey.toBase58());
  });

  it("Initializes a Provider", async () => {
    // 1 SOL base price per hour
    const basePrice = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); 
    
    const tx = await program.methods
      .initializeProvider({ a100: {} }, basePrice)
      .accounts({
        providerConfig: providerConfigPda,
        priceHistory: priceHistoryPda,
        owner: providerOwner.publicKey,
      })
      .signers([providerOwner])
      .rpc();

    const providerState = await program.account.providerConfig.fetch(providerConfigPda);
    assert.strictEqual(providerState.currentMultiplier, 100);
    assert.strictEqual(providerState.basePrice.toString(), basePrice.toString());
  });

  it("Oracle updates multiplier based on demand", async () => {
    const newMultiplier = 150; // 1.5x
    const reasoningHash = Array.from({ length: 32 }, () => 0); // Mock 32 byte array

    const tx = await program.methods
      .updateMultiplier(newMultiplier, reasoningHash)
      .accounts({
        providerConfig: providerConfigPda,
        priceHistory: priceHistoryPda,
        protocolConfig: protocolConfigPda,
        oracle: oracle.publicKey,
      })
      .signers([oracle])
      .rpc();

    const providerState = await program.account.providerConfig.fetch(providerConfigPda);
    assert.strictEqual(providerState.currentMultiplier, 150);
  });

  it("Renter rents hardware at 1.5x price", async () => {
    // duration_hours = 2
    const durationHours = 2;
    // 1 SOL base price * 2 hours * 1.5 multiplier = 3 SOL
    const expectedCost = 3 * anchor.web3.LAMPORTS_PER_SOL;

    const initialProviderConfigBalance = await provider.connection.getBalance(providerConfigPda);

    const tx = await program.methods
      .rentHardware(durationHours)
      .accounts({
        providerConfig: providerConfigPda,
        renter: renter.publicKey,
      } as any)
      .signers([renter])
      .rpc();

    const finalProviderConfigBalance = await provider.connection.getBalance(providerConfigPda);
    assert.strictEqual(finalProviderConfigBalance - initialProviderConfigBalance, expectedCost);
    
    const providerState = await program.account.providerConfig.fetch(providerConfigPda);
    assert.strictEqual(providerState.totalRentals.toNumber(), 1);
  });

  it("Provider withdraws earnings", async () => {
    const withdrawAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
    
    const initialBalance = await provider.connection.getBalance(providerOwner.publicKey);

    await program.methods
      .withdrawEarnings(withdrawAmount)
      .accounts({
        providerConfig: providerConfigPda,
        owner: providerOwner.publicKey,
      } as any)
      .signers([providerOwner])
      .rpc();

    const finalBalance = await provider.connection.getBalance(providerOwner.publicKey);
    // Rough check as fees are deducted
    assert.isAbove(finalBalance, initialBalance);
  });

  it("Admin updates the oracle", async () => {
    const newOracle = anchor.web3.Keypair.generate();
    
    await program.methods
      .updateOracle(newOracle.publicKey)
      .accounts({
        protocolConfig: protocolConfigPda,
        admin: admin.publicKey,
      } as any)
      .signers([admin])
      .rpc();

    const config = await program.account.protocolConfig.fetch(protocolConfigPda);
    assert.strictEqual(config.oracle.toBase58(), newOracle.publicKey.toBase58());
  });
});
