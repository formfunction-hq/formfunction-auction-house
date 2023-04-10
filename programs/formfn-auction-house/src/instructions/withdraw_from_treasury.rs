use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};
use anchor_spl::token::{Mint, Token};

use crate::{constants::*, AuctionHouse};

#[derive(Accounts)]
pub struct WithdrawFromTreasury<'info> {
    treasury_mint: Account<'info, Mint>,
    authority: Signer<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    treasury_withdrawal_destination: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.key().as_ref(),
            TREASURY.as_bytes()
        ],
        bump = auction_house.treasury_bump
    )]
    auction_house_treasury: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = authority,
        has_one = treasury_mint,
        has_one = treasury_withdrawal_destination,
        has_one = auction_house_treasury,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            treasury_mint.key().as_ref()
        ],
        bump = auction_house.bump,
    )]
    auction_house: Account<'info, AuctionHouse>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handle_withdraw_from_treasury(
    ctx: Context<WithdrawFromTreasury>,
    amount: u64,
) -> Result<()> {
    let treasury_mint = &ctx.accounts.treasury_mint;
    let treasury_withdrawal_destination = &ctx.accounts.treasury_withdrawal_destination;
    let auction_house_treasury = &ctx.accounts.auction_house_treasury;
    let auction_house = &ctx.accounts.auction_house;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;

    let is_native = treasury_mint.key() == spl_token::native_mint::id();
    let auction_house_seeds = [
        PREFIX.as_bytes(),
        auction_house.creator.as_ref(),
        auction_house.treasury_mint.as_ref(),
        &[auction_house.bump],
    ];

    let ah_key = auction_house.key();
    let auction_house_treasury_seeds = [
        PREFIX.as_bytes(),
        ah_key.as_ref(),
        TREASURY.as_bytes(),
        &[auction_house.treasury_bump],
    ];
    if !is_native {
        invoke_signed(
            &spl_token::instruction::transfer(
                token_program.key,
                &auction_house_treasury.key(),
                &treasury_withdrawal_destination.key(),
                &auction_house.key(),
                &[],
                amount,
            )?,
            &[
                auction_house_treasury.to_account_info(),
                treasury_withdrawal_destination.to_account_info(),
                token_program.to_account_info(),
                auction_house.to_account_info(),
            ],
            &[&auction_house_seeds],
        )?;
    } else {
        invoke_signed(
            &system_instruction::transfer(
                &auction_house_treasury.key(),
                &treasury_withdrawal_destination.key(),
                amount,
            ),
            &[
                auction_house_treasury.to_account_info(),
                treasury_withdrawal_destination.to_account_info(),
                system_program.to_account_info(),
            ],
            &[&auction_house_treasury_seeds],
        )?;
    }

    Ok(())
}
