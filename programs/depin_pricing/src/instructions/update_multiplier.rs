use anchor_lang::prelude::*;
use crate::state::{ProtocolConfig, ProviderConfig, PriceHistory};
use crate::errors::PricingError;

#[derive(Accounts)]
pub struct UpdateMultiplier<'info> {
    #[account(
        mut,
        seeds = [b"provider_v1", provider_config.owner.key().as_ref()],
        bump
    )]
    pub provider_config: Account<'info, ProviderConfig>,
    
    #[account(
        mut,
        seeds = [b"history_v1", provider_config.owner.key().as_ref()],
        bump,
        realloc = PriceHistory::LEN,
        realloc::payer = oracle,
        realloc::zero = false,
    )]
    pub price_history: Account<'info, PriceHistory>,
    
    #[account(
        seeds = [b"protocol_cfg_v1"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    
    // Only the AI Oracle can sign this transaction
    #[account(
        mut,
        constraint = oracle.key() == protocol_config.oracle @ PricingError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct MultiplierUpdated {
    pub provider: Pubkey,
    pub old_multiplier: u16,
    pub new_multiplier: u16,
    pub confidence: u8,
    pub reasoning_hash: [u8; 32],
    pub timestamp: i64,
}

pub fn update_multiplier(
    ctx: Context<UpdateMultiplier>, 
    new_multiplier: u16, 
    confidence: u8,
    reasoning_hash: [u8; 32]
) -> Result<()> {
    let protocol = &ctx.accounts.protocol_config;
    let provider = &mut ctx.accounts.provider_config;
    let history = &mut ctx.accounts.price_history;
    let clock = Clock::get()?;

    // 🛡️ Security & Business Constraints
    require!(new_multiplier >= protocol.min_multiplier, PricingError::PriceOutOfBounds);
    require!(new_multiplier <= protocol.max_multiplier, PricingError::PriceOutOfBounds);
    require!(
        clock.unix_timestamp >= provider.last_updated + protocol.update_cooldown,
        PricingError::CooldownNotElapsed
    );

    let old_multiplier = provider.current_multiplier;

    // 🔄 Update state using encapsulated logic
    provider.update_multiplier(new_multiplier, clock.unix_timestamp);
    history.add_entry(new_multiplier, confidence, clock.unix_timestamp, reasoning_hash);

    // 📡 Notify off-chain observers
    emit!(MultiplierUpdated {
        provider: provider.owner,
        old_multiplier,
        new_multiplier,
        confidence,
        reasoning_hash,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
