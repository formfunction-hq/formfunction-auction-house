use anchor_lang::prelude::*;

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError, EditionDistributor};

#[derive(Accounts)]
pub struct SetEditionDistributorLimitPerAddress<'info> {
    /// CHECK: Validated in instruction handler.
    owner: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = owner,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            edition_distributor.master_edition_mint.key().as_ref()
        ],
        bump = edition_distributor.bump,
    )]
    edition_distributor: Account<'info, EditionDistributor>,
    /// CHECK: Validated in instruction handler.
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
}

pub fn handle_set_edition_distributor_limit_per_address<'info>(
    ctx: Context<'_, '_, '_, 'info, SetEditionDistributorLimitPerAddress<'info>>,
    limit_per_address: u16,
) -> Result<()> {
    let auction_house = &mut ctx.accounts.auction_house;
    let authority = &mut ctx.accounts.authority;
    let edition_distributor = &mut ctx.accounts.edition_distributor;
    let owner = &mut ctx.accounts.owner;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    if !owner.to_account_info().is_signer && !authority.to_account_info().is_signer {
        return Err(AuctionHouseError::NoValidSignerPresent.into());
    }

    edition_distributor.limit_per_address = limit_per_address;

    Ok(())
}
