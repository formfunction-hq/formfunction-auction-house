use std::str::FromStr;

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::{constants::*, utils::*, AuctionHouse, EditionDistributor};

#[derive(Accounts)]
pub struct WithdrawBonk<'info> {
    /// CHECK: No need to deserialize
    #[account()]
    master_edition_mint: UncheckedAccount<'info>,
    #[account(
        has_one = master_edition_mint,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            master_edition_mint.key().as_ref()
        ],
        bump = edition_distributor.bump
    )]
    edition_distributor: Box<Account<'info, EditionDistributor>>,
    authority: Signer<'info>,
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
    // Token account that holds Bonk
    #[account(
        mut,
        owner = token::ID
    )]
    edition_distributor_token_account: Account<'info, TokenAccount>,
    /// Account to send the token to.
    /// CHECK: Passed to token program
    #[account(mut)]
    token_receiver: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
}

pub fn handle_withdraw_bonk(ctx: Context<WithdrawBonk>) -> Result<()> {
    let edition_distributor = &ctx.accounts.edition_distributor;
    let edition_distributor_token_account = &ctx.accounts.edition_distributor_token_account;
    let token_receiver = &ctx.accounts.token_receiver;
    let token_program = &ctx.accounts.token_program;
    let auction_house = &ctx.accounts.auction_house;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    if ctx.program_id.to_string() == AUCTION_HOUSE_MAINNET_PROGRAM_ID {
        // We only care about performing this check for the mainnet program
        let bonk_mint_key = Pubkey::from_str(BONK_MINT).unwrap();
        assert_keys_equal(bonk_mint_key, edition_distributor_token_account.mint)?;
    }

    let seeds = [
        EDITION_DISTRIBUTOR.as_bytes(),
        &edition_distributor.master_edition_mint.to_bytes(),
        &[edition_distributor.bump],
    ];

    token::transfer(
        CpiContext::new(
            token_program.to_account_info(),
            token::Transfer {
                from: edition_distributor_token_account.to_account_info(),
                to: token_receiver.to_account_info(),
                authority: edition_distributor.to_account_info(),
            },
        )
        .with_signer(&[&seeds[..]]),
        edition_distributor_token_account.amount,
    )?;

    Ok(())
}
