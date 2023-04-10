use anchor_lang::prelude::*;
use anchor_spl::token::{self, TokenAccount};

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError, LastBidPrice};

#[derive(Accounts)]
pub struct SetLastBidPrice<'info> {
    /// CHECK: No need to deserialize.
    owner: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
    #[account(
        has_one = owner,
        owner = token::ID
    )]
    token_account: Account<'info, TokenAccount>,
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
    #[account(mut)]
    last_bid_price: Account<'info, LastBidPrice>,
}

pub fn handle_set_last_bid_price<'info>(
    ctx: Context<'_, '_, '_, 'info, SetLastBidPrice<'info>>,
    price: u64,
) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let authority = &ctx.accounts.authority;
    let last_bid_price = &mut ctx.accounts.last_bid_price;
    let token_account = &ctx.accounts.token_account;
    let auction_house = &ctx.accounts.auction_house;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;
    assert_valid_last_bid_price(
        &last_bid_price.to_account_info(),
        ctx.program_id,
        &token_account.mint,
    )?;

    if !owner.to_account_info().is_signer && !authority.to_account_info().is_signer {
        return Err(AuctionHouseError::NoValidSignerPresent.into());
    }

    if token_account.amount == 0 {
        return Err(AuctionHouseError::InvalidTokenAmount.into());
    }

    last_bid_price.price = price;
    if price == 0 {
        last_bid_price.bidder = Some(ZERO_PUBKEY);
    }

    Ok(())
}
