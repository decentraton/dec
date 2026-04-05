use anchor_lang::prelude::*;
use crate::state::{ProviderConfig, PriceHistory};
use crate::errors::PricingError;

#[derive(Accounts)]
pub struct DisputeMultiplier<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,

    #[account(
        mut,
        seeds = [b"provider_v1", provider.key().as_ref()],
        bump,
        has_one = owner @ PricingError::UnauthorizedProvider
    )]
    pub provider_config: Account<'info, ProviderConfig>,

    #[account(
        mut,
        seeds = [b"history_v1", provider.key().as_ref()],
        bump
    )]
    pub price_history: Account<'info, PriceHistory>,

    pub owner: SystemAccount<'info>,
}

pub fn dispute_multiplier(ctx: Context<DisputeMultiplier>, entry_idx: u8) -> Result<()> {
    let provider = &mut ctx.accounts.provider_config;
    let history = &mut ctx.accounts.price_history;
    let clock = Clock::get()?;

    // Check if index is valid
    require!(entry_idx < 10, PricingError::InvalidIndex);
    
    let entry = &history.entries[entry_idx as usize];
    
    // Dispute condition: Price must be significantly different from base (mock logic)
    // In a real scenario, this would involve ZK-proofs or secondary oracle consensus
    require!(entry.confidence < 50, PricingError::HighConfidenceDisputeDenied);

    // Reset multiplier to 1.0x (100) as temporary relief
    provider.current_multiplier = 100;
    provider.last_updated = clock.unix_timestamp;

    msg!("Dispute successful for entry {}. Multiplier reset to 1.0x", entry_idx);

    Ok(())
}
