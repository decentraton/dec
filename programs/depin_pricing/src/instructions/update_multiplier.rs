use anchor_lang::prelude::*;
use crate::state::{ProtocolConfig, ProviderConfig, PriceHistory, PriceEntry};
use crate::errors::PricingError;

#[derive(Accounts)]
pub struct UpdateMultiplier<'info> {
    #[account(
        mut,
        seeds = [b"provider", provider_config.owner.key().as_ref()],
        bump
    )]
    pub provider_config: Account<'info, ProviderConfig>,
    
    #[account(
        mut,
        seeds = [b"price_history", provider_config.owner.key().as_ref()],
        bump
    )]
    pub price_history: Account<'info, PriceHistory>,
    
    #[account(
        seeds = [b"protocol_config"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    
    // Only the AI Oracle can sign this transaction
    #[account(
        mut,
        constraint = oracle.key() == protocol_config.oracle @ PricingError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,
}

#[event]
pub struct MultiplierUpdated {
    pub provider: Pubkey,
    pub old_multiplier: u16,
    pub new_multiplier: u16,
    pub reasoning_hash: [u8; 32],
    pub timestamp: i64,
}

pub fn update_multiplier(ctx: Context<UpdateMultiplier>, new_multiplier: u16, reasoning_hash: [u8; 32]) -> Result<()> {
    let protocol = &ctx.accounts.protocol_config;
    let provider = &mut ctx.accounts.provider_config;
    let history = &mut ctx.accounts.price_history;
    let clock = Clock::get()?;

    // Security constraints
    require!(new_multiplier >= protocol.min_multiplier, PricingError::PriceOutOfBounds);
    require!(new_multiplier <= protocol.max_multiplier, PricingError::PriceOutOfBounds);
    require!(
        clock.unix_timestamp >= provider.last_updated + protocol.update_cooldown,
        PricingError::CooldownNotElapsed
    );

    let old_multiplier = provider.current_multiplier;

    // Update State
    provider.current_multiplier = new_multiplier;
    provider.last_updated = clock.unix_timestamp;

    // Record History
    let idx = history.current_index as usize;
    history.entries[idx] = PriceEntry {
        multiplier: new_multiplier,
        timestamp: clock.unix_timestamp,
        reasoning_hash,
    };
    history.current_index = (history.current_index + 1) % 10;

    emit!(MultiplierUpdated {
        provider: provider.owner,
        old_multiplier,
        new_multiplier,
        reasoning_hash,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
