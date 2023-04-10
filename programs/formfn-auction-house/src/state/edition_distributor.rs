use anchor_lang::prelude::*;

use crate::{PriceFunction, PRICE_FUNCTION_SIZE};

/// State for the account which distributes NFT editions.
#[account]
pub struct EditionDistributor {
    pub bump: u8,
    pub master_edition_mint: Pubkey,
    pub owner: Pubkey,
    pub price_function: PriceFunction,
    // There should always be a start time
    pub public_sale_start_time: i64,
    // End time is optional, e.g. an open edition that can be minted into eternity
    pub sale_end_time: Option<i64>,
    // Indicates if anti-bot protection (additional signer authority) is enabled for this EditionDistributor
    pub anti_bot_protection_enabled: bool,
    // Denotes the limit per address, 0 if unlimited. This only applies to public sale purchases.
    pub limit_per_address: u16,
    // Used to denote which currency the edition was listed with
    pub treasury_mint: Pubkey,
    // Optional start time for the allowlist sale, if there is one
    pub allowlist_sale_start_time: Option<i64>,
    // Allowlist sale price, if different from normal price
    pub allowlist_sale_price: Option<u64>,
    // The number of sales which occur via allowlist. This is relevant for public sale price calculations.
    pub allowlist_number_sold: u64,
}

pub const EDITION_DISTRIBUTOR_SIZE: usize = 8 + // Discriminator
1 + // bump
32 + // master_edition_mint
32 + // creator
PRICE_FUNCTION_SIZE + // price_function
8 + // public_sale_start_time
9 + // sale_end_time
1 + // anti_bot_protection_enabled
2 + // limit_per_address
32 + // treasury_mint Pubkey
9 + // allowlist_sale_start_time
9 + // allowlist_sale_price
8 +// allowlist_number_sold
191; // padding
