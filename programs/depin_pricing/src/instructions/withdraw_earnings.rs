use anchor_lang::prelude::*;
use crate::state::ProviderConfig;
use crate::errors::PricingError;

#[derive(Accounts)]
pub struct WithdrawEarnings<'info> {
    #[account(
        mut,
        seeds = [b"provider", owner.key().as_ref()],
        bump
    )]
    pub provider_config: Account<'info, ProviderConfig>,
    
    // The owner must sign
    #[account(
        mut,
        constraint = owner.key() == provider_config.owner
    )]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct EarningsWithdrawn {
    pub provider: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

pub fn withdraw_earnings(ctx: Context<WithdrawEarnings>, amount: u64) -> Result<()> {
    let provider_info = ctx.accounts.provider_config.to_account_info();
    let owner_info = ctx.accounts.owner.to_account_info();

    let rent_minimum = Rent::get()?.minimum_balance(provider_info.data_len());
    let available_amount = provider_info.lamports().checked_sub(rent_minimum).unwrap_or(0);
    
    require!(amount <= available_amount, PricingError::InsufficientFunds);

    **provider_info.try_borrow_mut_lamports()? -= amount;
    **owner_info.try_borrow_mut_lamports()? += amount;

    let clock = Clock::get()?;

    emit!(EarningsWithdrawn {
        provider: ctx.accounts.owner.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
