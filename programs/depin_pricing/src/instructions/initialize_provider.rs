use anchor_lang::prelude::*;
use crate::state::{ProviderConfig, PriceHistory, GpuType};

#[derive(Accounts)]
pub struct InitializeProvider<'info> {
    #[account(
        init,
        payer = owner,
        space = ProviderConfig::LEN,
        seeds = [b"provider_v1", owner.key().as_ref()],
        bump
    )]
    pub provider_config: Account<'info, ProviderConfig>,
    
    #[account(
        init,
        payer = owner,
        space = PriceHistory::LEN,
        seeds = [b"history_v1", owner.key().as_ref()],
        bump
    )]
    pub price_history: Account<'info, PriceHistory>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_provider(ctx: Context<InitializeProvider>, gpu_type: GpuType, base_price: u64) -> Result<()> {
    let config = &mut ctx.accounts.provider_config;
    let clock = Clock::get()?;
    
    config.owner = ctx.accounts.owner.key();
    config.gpu_type = gpu_type;
    config.base_price = base_price;
    config.current_multiplier = 100; // 1.0x default
    config.last_updated = clock.unix_timestamp;
    config.total_rentals = 0;
    config.is_active = true;

    let history = &mut ctx.accounts.price_history;
    history.provider = ctx.accounts.owner.key();
    history.current_index = 0;
    
    Ok(())
}
