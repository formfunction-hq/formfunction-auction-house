use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError, LastBidPrice};

#[derive(Accounts)]
pub struct SetPreviousBidder<'info> {
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

pub fn handle_set_previous_bidder<'info>(
    ctx: Context<'_, '_, '_, 'info, SetPreviousBidder<'info>>,
    bidder: Option<Pubkey>,
) -> Result<()> {
    let auction_house = &ctx.accounts.auction_house;
    let token_mint = &ctx.accounts.token_mint;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    let last_bid_price = &mut ctx.accounts.last_bid_price;
    assert_valid_last_bid_price(
        &last_bid_price.to_account_info(),
        ctx.program_id,
        &token_mint.key(),
    )?;

    match bidder {
        None => {
            if last_bid_price.price != 0 && last_bid_price.bidder != None {
                return Err(AuctionHouseError::CannotOverrideBidderAuctionInProgress.into());
            }
            last_bid_price.bidder = Some(ZERO_PUBKEY);
        }
        Some(bidder) => {
            last_bid_price.bidder = Some(bidder);
        }
    };

    Ok(())
}
