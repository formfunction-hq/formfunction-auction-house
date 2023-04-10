use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};

use crate::{constants::*, AuctionHouse};

#[derive(Accounts)]
pub struct WithdrawFromFee<'info> {
    authority: Signer<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    fee_withdrawal_destination: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.key().as_ref(),
            FEE_PAYER.as_bytes()
        ],
        bump = auction_house.fee_payer_bump
    )]
    auction_house_fee_account: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = authority,
        has_one = fee_withdrawal_destination,
        has_one = auction_house_fee_account,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.key().as_ref()
        ],
        bump = auction_house.bump,
    )]
    auction_house: Account<'info, AuctionHouse>,
    system_program: Program<'info, System>,
}

pub fn handle_withdraw_from_fee(ctx: Context<WithdrawFromFee>, amount: u64) -> Result<()> {
    let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
    let fee_withdrawal_destination = &ctx.accounts.fee_withdrawal_destination;
    let auction_house = &ctx.accounts.auction_house;
    let system_program = &ctx.accounts.system_program;

    let auction_house_key = auction_house.key();
    let seeds = [
        PREFIX.as_bytes(),
        auction_house_key.as_ref(),
        FEE_PAYER.as_bytes(),
        &[auction_house.fee_payer_bump],
    ];

    invoke_signed(
        &system_instruction::transfer(
            &auction_house_fee_account.key(),
            &fee_withdrawal_destination.key(),
            amount,
        ),
        &[
            auction_house_fee_account.to_account_info(),
            fee_withdrawal_destination.to_account_info(),
            system_program.to_account_info(),
        ],
        &[&seeds],
    )?;

    Ok(())
}
