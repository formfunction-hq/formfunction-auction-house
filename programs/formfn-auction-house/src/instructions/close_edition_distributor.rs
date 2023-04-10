use anchor_lang::prelude::*;

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError, EditionDistributor};

#[derive(Accounts)]
pub struct CloseEditionDistributor<'info> {
    /// CHECK: No need to deserialize.
    #[account()]
    master_edition_mint: UncheckedAccount<'info>,
    #[account(
        mut,
        close = rent_receiver,
        has_one = owner,
        has_one = master_edition_mint,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            master_edition_mint.key().as_ref()
        ],
        bump = edition_distributor.bump,
    )]
    edition_distributor: Account<'info, EditionDistributor>,
    /// CHECK: No need to deserialize.
    owner: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
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
    /// Who receives the remaining rent allocation.
    /// CHECK: No need to deserialize.
    #[account(mut)]
    rent_receiver: UncheckedAccount<'info>,
}

pub fn handle_close_edition_distributor<'info>(
    ctx: Context<'_, '_, '_, 'info, CloseEditionDistributor<'info>>,
) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let authority = &ctx.accounts.authority;
    let auction_house = &ctx.accounts.auction_house;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    if !owner.to_account_info().is_signer && !authority.to_account_info().is_signer {
        return Err(AuctionHouseError::NoValidSignerPresent.into());
    }

    Ok(())
}
