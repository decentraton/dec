use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("36rS72Rgx7WesAjwv2cernhGDHBWXZuS3wpCTJVwULPj");

#[program]
pub mod depin_pricing {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        oracle: Pubkey,
        min_multiplier: u16,
        max_multiplier: u16,
        update_cooldown: i64,
    ) -> Result<()> {
        instructions::initialize_protocol(
            ctx,
            oracle,
            min_multiplier,
            max_multiplier,
            update_cooldown,
        )
    }

    pub fn initialize_provider(
        ctx: Context<InitializeProvider>,
        gpu_type: GpuType,
        base_price: u64,
    ) -> Result<()> {
        instructions::initialize_provider(ctx, gpu_type, base_price)
    }

    pub fn update_multiplier(
        ctx: Context<UpdateMultiplier>,
        new_multiplier: u16,
        reasoning_hash: [u8; 32],
    ) -> Result<()> {
        instructions::update_multiplier(ctx, new_multiplier, reasoning_hash)
    }

    pub fn rent_hardware(
        ctx: Context<RentHardware>,
        duration_hours: u16,
    ) -> Result<()> {
        instructions::rent_hardware(ctx, duration_hours)
    }

    pub fn withdraw_earnings(
        ctx: Context<WithdrawEarnings>,
        amount: u64,
    ) -> Result<()> {
        instructions::withdraw_earnings(ctx, amount)
    }

    pub fn update_oracle(
        ctx: Context<UpdateOracle>,
        new_oracle: Pubkey,
    ) -> Result<()> {
        instructions::update_oracle(ctx, new_oracle)
    }
}
