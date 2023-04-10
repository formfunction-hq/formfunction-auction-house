use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError, EditionDistributor};

#[derive(Accounts)]
pub struct CloseEditionDistributorTokenAccount<'info> {
    /// CHECK: No need to deserialize
    #[account()]
    master_edition_mint: UncheckedAccount<'info>,
    #[account(
        has_one = owner,
        has_one = master_edition_mint,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            master_edition_mint.key().as_ref()
        ],
        bump = edition_distributor.bump,
    )]
    edition_distributor: Box<Account<'info, EditionDistributor>>,
    /// CHECK: No need to deserialize.
    owner: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
    #[account(
        seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref()
        ],
        bump = auction_house.bump,
        has_one = authority
    )]
    auction_house: Account<'info, AuctionHouse>,
    #[account(
        mut,
        owner = token::ID,
        constraint = edition_distributor_token_account.amount == 1
    )]
    edition_distributor_token_account: Account<'info, TokenAccount>,
    /// Account to send the token to.
    /// CHECK: Passed to token program
    #[account(mut)]
    token_receiver: UncheckedAccount<'info>,
    /// Who receives the remaining rent allocation.
    /// CHECK: This is used in a Transfer instruction.
    #[account(mut)]
    rent_receiver: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
}

pub fn handle_close_edition_distributor_token_account<'info>(
    ctx: Context<'_, '_, '_, 'info, CloseEditionDistributorTokenAccount<'info>>,
) -> Result<()> {
    let edition_distributor = &ctx.accounts.edition_distributor;
    let edition_distributor_token_account = &ctx.accounts.edition_distributor_token_account;
    let master_edition_mint = &ctx.accounts.master_edition_mint;
    let token_receiver = &ctx.accounts.token_receiver;
    let rent_receiver = &ctx.accounts.rent_receiver;
    let token_program = &ctx.accounts.token_program;
    let owner = &ctx.accounts.owner;
    let authority = &ctx.accounts.authority;
    let auction_house = &ctx.accounts.auction_house;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    if !owner.to_account_info().is_signer && !authority.to_account_info().is_signer {
        return Err(AuctionHouseError::NoValidSignerPresent.into());
    }

    assert_keys_equal(
        master_edition_mint.key(),
        edition_distributor_token_account.mint,
    )?;

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

    token::close_account(
        CpiContext::new(
            token_program.to_account_info(),
            token::CloseAccount {
                account: edition_distributor_token_account.to_account_info(),
                destination: rent_receiver.to_account_info(),
                authority: edition_distributor.to_account_info(),
            },
        )
        .with_signer(&[&seeds[..]]),
    )?;

    Ok(())
}
