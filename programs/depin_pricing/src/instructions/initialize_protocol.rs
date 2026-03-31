use anchor_lang::prelude::*;
use crate::state::ProtocolConfig;

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = admin,
        space = ProtocolConfig::LEN,
        seeds = [b"protocol_config"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_protocol(
    ctx: Context<InitializeProtocol>,
    oracle: Pubkey,
    min_multiplier: u16,
    max_multiplier: u16,
    update_cooldown: i64,
) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.admin = ctx.accounts.admin.key();
    config.oracle = oracle;
    config.min_multiplier = min_multiplier;
    config.max_multiplier = max_multiplier;
    config.update_cooldown = update_cooldown;
    Ok(())
}
