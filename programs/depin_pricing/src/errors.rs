use anchor_lang::prelude::*;

#[error_code]
pub enum PricingError {
    #[msg("Unauthorized oracle attempted to update prices.")]
    UnauthorizedOracle,
    #[msg("The price multiplier provided is out of the allowed bounds.")]
    PriceOutOfBounds,
    #[msg("The update cooldown has not elapsed yet.")]
    CooldownNotElapsed,
    #[msg("Hardware provider is inactive.")]
    ProviderInactive,
    #[msg("Math calculation overflowed.")]
    MathOverflow,
    #[msg("Insufficient funds in the escrow PDA.")]
    InsufficientFunds,
    #[msg("Unauthorized admin attempted to update protocol.")]
    UnauthorizedAdmin,
}
