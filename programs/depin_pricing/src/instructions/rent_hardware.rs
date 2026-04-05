use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{ProviderConfig, GpuType};
use crate::errors::PricingError;

#[derive(Accounts)]
pub struct RentHardware<'info> {
    #[account(
        mut,
        seeds = [b"provider_v1", provider_config.owner.key().as_ref()],
        bump
    )]
    pub provider_config: Account<'info, ProviderConfig>,
    
    // CHECK: Removed provider_owner since funds go to the PDA now    
    #[account(mut)]
    pub renter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct HardwareRented {
    pub provider: Pubkey,
    pub renter: Pubkey,
    pub final_price: u64,
    pub duration_hours: u16,
    pub gpu_type: GpuType,
}

pub fn rent_hardware(ctx: Context<RentHardware>, duration_hours: u16) -> Result<()> {
    require!(ctx.accounts.provider_config.is_active, PricingError::ProviderInactive);

    // Calculate dynamic price based on integer multiplier (100 = 1.0x)
    let base_price = ctx.accounts.provider_config.base_price;
    let multiplier = ctx.accounts.provider_config.current_multiplier;
    
    let total_base_price = base_price.checked_mul(duration_hours as u64).unwrap();
    let final_price = total_base_price
        .checked_mul(multiplier as u64)
        .unwrap()
        .checked_div(100)
        .unwrap();

    // Transfer SOL from renter to hardware provider PDA
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.renter.to_account_info(),
            to: ctx.accounts.provider_config.to_account_info(),
        },
    );
    transfer(cpi_context, final_price)?;

    // Update stats after successful transfer
    let provider = &mut ctx.accounts.provider_config;
    provider.total_rentals = provider.total_rentals.checked_add(1).unwrap();

    emit!(HardwareRented {
        provider: provider.owner,
        renter: ctx.accounts.renter.key(),
        final_price,
        duration_hours,
        gpu_type: provider.gpu_type,
    });

    Ok(())
}
