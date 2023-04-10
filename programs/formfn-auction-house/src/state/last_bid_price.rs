use anchor_lang::prelude::*;

// Despite the name, this PDA stores general information (such as the last
// bid price) about an NFT which is listed for sale in some way.
#[account]
pub struct LastBidPrice {
    pub price: u64,
    pub bidder: Option<Pubkey>,
    pub has_been_sold: u8,
    pub tick_size_constant_in_lamports: u64,
    pub has_campaign_escrow_treasury: bool,
}

pub const LAST_BID_PRICE_SIZE: usize = 8 + // Discriminator
8 + // price
33 + // bidder
1 + // has_been_sold
8 + // tick_size_constant_in_lamports
1 + // has_campaign_escrow_treasury
85; // padding
