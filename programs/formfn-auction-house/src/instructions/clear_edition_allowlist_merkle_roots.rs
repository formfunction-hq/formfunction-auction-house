use anchor_lang::prelude::*;

use crate::{constants::*, AuctionHouse, EditionAllowlistSettings, EditionDistributor};

#[derive(Accounts)]
pub struct ClearEditionAllowlistMerkleRoots<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            edition_distributor.key().as_ref()
        ],
        bump = edition_distributor.bump
    )]
    edition_distributor: Account<'info, EditionDistributor>,
    #[account(
        mut,
        seeds = [
            EDITION_ALLOWLIST.as_bytes(),
            edition_distributor.key().as_ref()
        ],
        bump = edition_allowlist_settings.bump
    )]
    edition_allowlist_settings: Account<'info, EditionAllowlistSettings>,
    #[account(
        has_one = authority,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref()
        ],
        bump = auction_house.bump,
    )]
    auction_house: Account<'info, AuctionHouse>,
}

pub fn handle_clear_edition_allowlist_merkle_roots<'info>(
    ctx: Context<'_, '_, '_, 'info, ClearEditionAllowlistMerkleRoots<'info>>,
) -> Result<()> {
    let edition_allowlist_settings = &mut ctx.accounts.edition_allowlist_settings;

    let existing_root_list_length = edition_allowlist_settings.merkle_roots.len();

    let empty_root_list: Vec<[u8; 32]> = Vec::new();
    edition_allowlist_settings.merkle_roots = empty_root_list;

    msg!(
        "Successfully cleared edition allowlist merkle root list. Previous root list length = {}.",
        existing_root_list_length
    );

    Ok(())
}
