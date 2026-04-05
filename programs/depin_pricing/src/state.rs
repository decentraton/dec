use anchor_lang::prelude::*;

/// Supported GPU architectures for rental
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum GpuType {
    A100,
    H100,
    RTX4090,
}

/// Main configuration for a GPU hardware provider
#[account]
pub struct ProviderConfig {
    /// Owner of the hardware (only this account can pull liquidity)
    pub owner: Pubkey,
    /// Hardware tier
    pub gpu_type: GpuType,
    /// Base price in lamports (e.g. per hour) before AI adjustments
    pub base_price: u64,
    /// Current real-time multiplier (100 = 1.0x, 150 = 1.5x)
    pub current_multiplier: u16,
    /// Last update timestamp from the AI Oracle
    pub last_updated: i64,
    /// Total successful rental count for reputation tracking
    pub total_rentals: u64,
    /// Security flag for immediate shutdown if needed
    pub is_active: bool,
    /// Reserved space for future upgrades (Padding)
    pub _reserved: [u8; 64],
}

impl ProviderConfig {
    /// Total account size: 8 (discrim) + 32 (pubkey) + 1 (enum) + 8 (u64) + 2 (u16) + 
    /// 8 (i64) + 8 (u64) + 1 (bool) + 64 (padding) = 132 bytes.
    pub const LEN: usize = 8 + 32 + 1 + 8 + 2 + 8 + 8 + 1 + 64;

    /// Updates the current multiplier and timestamp
    pub fn update_multiplier(&mut self, new_multiplier: u16, timestamp: i64) {
        self.current_multiplier = new_multiplier;
        self.last_updated = timestamp;
    }
}

/// Global protocol settings for the pricing oracle
#[account]
pub struct ProtocolConfig {
    /// Administrative authority for protocol parameters
    pub admin: Pubkey,
    /// Authorized AI Agent wallet that signs price updates
    pub oracle: Pubkey,
    /// Floor for AI pricing (e.g. 50 = 0.5x)
    pub min_multiplier: u16,
    /// Ceiling for AI pricing (e.g. 300 = 3.0x)
    pub max_multiplier: u16,
    /// Minimum seconds between AI price adjustments
    pub update_cooldown: i64,
    /// Reserved space for future upgrades (Padding)
    pub _reserved: [u8; 64],
}

impl ProtocolConfig {
    /// Total account size: 8 (discrim) + 32 (admin) + 32 (oracle) + 2 + 2 + 8 + 64 = 148 bytes.
    pub const LEN: usize = 8 + 32 + 32 + 2 + 2 + 8 + 64;
}

/// Individual analysis results from the AI Agent
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, Debug)]
pub struct PriceEntry {
    /// The multiplier decided by the AI (scaled 100x)
    pub multiplier: u16,
    /// Sequence number of the entry
    pub index: u16,
    /// AI's internal confidence score (0-100)
    pub confidence: u8,
    /// When the analysis was performed
    pub timestamp: i64,
    /// SHA-256 hash of the deep reasoning logs stored off-chain
    pub reasoning_hash: [u8; 32],
}

/// Ring-buffer of recent price adjustments for high-frequency analysis
#[account]
pub struct PriceHistory {
    /// The provider this history belongs to
    pub provider: Pubkey,
    /// Last 10 price adjustments
    pub entries: [PriceEntry; 10],
    /// Pointer for the next entry in the ring buffer
    pub current_index: u8,
    /// Reserved space for future metadata/analytics (Padding)
    pub _reserved: [u8; 128],
}

impl PriceHistory {
    /// Total size: 8 (discrim) + 32 (pubkey) + (10 * 45 (entry size)) + 1 (u8) + 128 (padding) = 619 bytes.
    pub const LEN: usize = 8 + 32 + (10 * 45) + 1 + 128;

    /// Adds a new price entry to the circular buffer
    pub fn add_entry(
        &mut self,
        multiplier: u16,
        confidence: u8,
        timestamp: i64,
        reasoning_hash: [u8; 32],
    ) {
        let idx = self.current_index as usize;
        self.entries[idx] = PriceEntry {
            multiplier,
            index: idx as u16,
            confidence,
            timestamp,
            reasoning_hash,
        };
        self.current_index = (self.current_index + 1) % 10;
    }
}
