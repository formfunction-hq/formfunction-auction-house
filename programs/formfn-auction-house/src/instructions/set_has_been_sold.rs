use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::{constants::*, utils::*, AuctionHouse, LastBidPrice};

#[derive(Accounts)]
pub struct SetHasBeenSold<'info> {
    authority: Signer<'info>,
    #[account()]
    token_mint: Account<'info, Mint>,
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

pub fn handle_set_has_been_sold<'info>(
    ctx: Context<'_, '_, '_, 'info, SetHasBeenSold<'info>>,
    has_been_sold: bool,
) -> Result<()> {
    let last_bid_price = &mut ctx.accounts.last_bid_price;
    let auction_house = &ctx.accounts.auction_house;
    let token_mint = &ctx.accounts.token_mint;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;
    assert_valid_last_bid_price(
        &last_bid_price.to_account_info(),
        ctx.program_id,
        &token_mint.key(),
    )?;

    last_bid_price.has_been_sold = match has_been_sold {
        false => 0,
        true => 1,
    };

    Ok(())
}
