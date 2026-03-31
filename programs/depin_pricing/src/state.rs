use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum GpuType {
    A100,
    H100,
    RTX4090,
}

#[account]
pub struct ProviderConfig {
    pub owner: Pubkey,
    pub gpu_type: GpuType,
    pub base_price: u64,            // Base price in lamports (e.g. per hour)
    pub current_multiplier: u16,    // 100 = 1.0x, 150 = 1.5x
    pub last_updated: i64,          // Unix timestamp
    pub total_rentals: u64,         // Lifetime rental count
    pub is_active: bool,            // Provider status
}

impl ProviderConfig {
    // Discriminator (8) + Pubkey (32) + GpuType enum (1) + u64 (8) + u16 (2) + i64 (8) + u64 (8) + bool (1)
    pub const LEN: usize = 8 + 32 + 1 + 8 + 2 + 8 + 8 + 1;
}

#[account]
pub struct ProtocolConfig {
    pub admin: Pubkey,
    pub oracle: Pubkey,             // AI Oracle Wallet pubkey
    pub min_multiplier: u16,
    pub max_multiplier: u16,
    pub update_cooldown: i64,       // Cooldown in seconds
}

impl ProtocolConfig {
    // Discriminator (8) + Admin Pubkey (32) + Oracle Pubkey (32) + u16 (2) + u16 (2) + i64 (8)
    pub const LEN: usize = 8 + 32 + 32 + 2 + 2 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct PriceEntry {
    pub multiplier: u16,
    pub timestamp: i64,
    pub reasoning_hash: [u8; 32],
}

#[account]
pub struct PriceHistory {
    pub provider: Pubkey,
    pub entries: [PriceEntry; 10],
    pub current_index: u8,
}

impl PriceHistory {
    // Discriminator (8) + Pubkey (32) + 10 * (2 + 8 + 32) + u8 (1)
    pub const LEN: usize = 8 + 32 + (10 * 42) + 1;
}
