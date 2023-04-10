use anchor_lang::prelude::*;

use crate::{
    constants::*, AuctionHouse, AuctionHouseError, EditionAllowlistSettings, EditionDistributor,
    EDITION_ALLOWLIST_SETTINGS_SIZE, NUMBER_OF_MERKLE_ROOTS_TO_STORE,
};

#[derive(Accounts)]
pub struct AppendEditionAllowlistMerkleRoots<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            edition_distributor.master_edition_mint.as_ref()
        ],
        bump = edition_distributor.bump
    )]
    edition_distributor: Account<'info, EditionDistributor>,
    #[account(
        init_if_needed,
        seeds = [
            EDITION_ALLOWLIST.as_bytes(),
            edition_distributor.key().as_ref()
        ],
        bump,
        payer = authority,
        space = EDITION_ALLOWLIST_SETTINGS_SIZE
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
    system_program: Program<'info, System>,
}

pub fn handle_append_edition_allowlist_merkle_roots<'info>(
    ctx: Context<'_, '_, '_, 'info, AppendEditionAllowlistMerkleRoots<'info>>,
    roots_to_append: Vec<[u8; 32]>,
) -> Result<()> {
    let edition_allowlist_settings = &mut ctx.accounts.edition_allowlist_settings;

    let root_list = &mut edition_allowlist_settings.merkle_roots;

    let roots_to_append_length = roots_to_append.len();
    if roots_to_append_length + root_list.len() > NUMBER_OF_MERKLE_ROOTS_TO_STORE {
        msg!(
            "Request to append {} roots to list with maximum length of {} is invalid. Current root list length = {}.",
            roots_to_append_length,
            NUMBER_OF_MERKLE_ROOTS_TO_STORE,
            root_list.len()
        );
        return Err(AuctionHouseError::MaximumRootCountExceeded.into());
    }

    let mut roots_to_append = roots_to_append.clone();
    root_list.append(&mut roots_to_append);

    msg!(
        "Successfully appended {} new roots to the edition allowlist merkle root list. Total root list length = {}.",
        roots_to_append_length,
        root_list.len()
    );

    let bump = *ctx.bumps.get("edition_allowlist_settings").unwrap();
    edition_allowlist_settings.bump = bump;

    Ok(())
}
