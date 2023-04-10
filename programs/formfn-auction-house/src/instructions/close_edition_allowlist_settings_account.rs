use anchor_lang::prelude::*;

use crate::{constants::*, AuctionHouse, EditionAllowlistSettings, EditionDistributor};

#[derive(Accounts)]
pub struct CloseEditionAllowlistSettingsAccount<'info> {
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
        bump = edition_allowlist_settings.bump,
        close = rent_receiver
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
    /// CHECK: Account which receives recovered funds from account closing.
    #[account(mut)]
    rent_receiver: UncheckedAccount<'info>,
}

pub fn handle_close_edition_allowlist_settings_account<'info>(
    _ctx: Context<'_, '_, '_, 'info, CloseEditionAllowlistSettingsAccount<'info>>,
) -> Result<()> {
    // Nothing to do here yet.
    Ok(())
}
