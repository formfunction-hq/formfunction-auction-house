use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount};

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError, LastBidPrice};

#[derive(Accounts)]
pub struct SetTickSize<'info> {
    /// CHECK: No need to deserialize.
    owner: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
    #[account(
        has_one = owner,
        has_one = mint,
        owner = token::ID
    )]
    token_account: Account<'info, TokenAccount>,
    mint: Account<'info, Mint>,
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
    treasury_mint: Account<'info, Mint>,
}

pub fn handle_set_tick_size<'info>(
    ctx: Context<'_, '_, '_, 'info, SetTickSize<'info>>,
    tick_size_constant_in_full_decimals: u64,
    // These are unused, but we may use them later
    _tick_size_percent: u8,
    _tick_size_min_in_lamports: u64,
    _tick_size_max_in_lamports: u64,
) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let authority = &ctx.accounts.authority;
    let last_bid_price = &mut ctx.accounts.last_bid_price;
    let token_account = &ctx.accounts.token_account;
    let auction_house = &ctx.accounts.auction_house;
    let treasury_mint = &ctx.accounts.treasury_mint;

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

    if tick_size_constant_in_full_decimals != 0
        && tick_size_constant_in_full_decimals
            < get_min_price_difference_for_decimals(treasury_mint.decimals)
    {
        // We allow resetting to 0, because 0 means that the default tick size of 10% should be used.
        return Err(AuctionHouseError::TickSizeTooLow.into());
    }

    last_bid_price.tick_size_constant_in_lamports = tick_size_constant_in_full_decimals;

    Ok(())
}
