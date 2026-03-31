use anchor_lang::prelude::*;
use crate::state::ProtocolConfig;
use crate::errors::PricingError;

#[derive(Accounts)]
pub struct UpdateOracle<'info> {
    #[account(
        mut,
        seeds = [b"protocol_config"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    
    // Only the admin can sign this transaction
    #[account(
        mut,
        constraint = admin.key() == protocol_config.admin @ PricingError::UnauthorizedAdmin
    )]
    pub admin: Signer<'info>,
}

#[event]
pub struct OracleUpdated {
    pub old_oracle: Pubkey,
    pub new_oracle: Pubkey,
    pub timestamp: i64,
}

pub fn update_oracle(ctx: Context<UpdateOracle>, new_oracle: Pubkey) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol_config;
    let clock = Clock::get()?;

    let old_oracle = protocol.oracle;
    protocol.oracle = new_oracle;

    emit!(OracleUpdated {
        old_oracle,
        new_oracle,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
