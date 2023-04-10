use anchor_lang::prelude::*;

#[account]
pub struct AuctionHouse {
    pub auction_house_fee_account: Pubkey,
    pub auction_house_treasury: Pubkey,
    pub treasury_withdrawal_destination: Pubkey,
    pub fee_withdrawal_destination: Pubkey,
    pub treasury_mint: Pubkey,
    pub authority: Pubkey,
    pub creator: Pubkey,
    pub bump: u8,
    pub treasury_bump: u8,
    pub fee_payer_bump: u8,
    pub seller_fee_basis_points: u16,
    pub requires_sign_off: bool,
    pub can_change_sale_price: bool,
    pub seller_fee_basis_points_secondary: u16,

    // New
    // TODO[@arcticmatt]: Is this field account for in AUCTION_HOUSE_SIZE?
    pub pay_all_fees: bool,
}

pub const AUCTION_HOUSE_SIZE: usize = 8 + //key
32 + //fee payer
32 + //treasury
32 + //treasury_withdrawal_destination
32 + //fee withdrawal destination
32 + //treasury mint
32 + //authority
32 + // creator
1 + // bump
1 + // treasury_bump
1 + // fee_payer_bump
2 + // seller fee basis points
1 + // requires sign off
1 + // can change sale price
2 + // seller fee basis points secondary
220; // padding
