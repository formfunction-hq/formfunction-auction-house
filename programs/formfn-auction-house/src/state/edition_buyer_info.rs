use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct EditionBuyerInfoAccount {
    // Number bought for a normal public sale.
    pub number_bought: u16,
    // Number bought in for an edition allowlist sale.
    pub number_bought_allowlist: u16,
}

pub const EDITION_BUYER_INFO_ACCOUNT_SPACE: usize = 8 + // Discriminator
2 + // number_bought
2 + // number_bought_allowlist
62; // padding
