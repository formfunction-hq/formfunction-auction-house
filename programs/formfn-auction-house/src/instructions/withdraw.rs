use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token},
};

use crate::{constants::*, utils::*, AuctionHouse};

#[derive(Accounts)]
#[instruction(escrow_payment_bump: u8)]
pub struct Withdraw<'info> {
    /// CHECK: No need to deserialize.
    wallet: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    receipt_account: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.key().as_ref(),
            wallet.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump = escrow_payment_bump)
    ]
    escrow_payment_account: UncheckedAccount<'info>,
    treasury_mint: Account<'info, Mint>,
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
    #[account(
        has_one = authority,
        has_one = treasury_mint,
        has_one = auction_house_fee_account,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref()
        ],
        bump = auction_house.bump,
    )]
    auction_house: Account<'info, AuctionHouse>,
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
    /// CHECK: No need to deserialize.
    token_mint: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    ata_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
}

pub fn handle_withdraw(ctx: Context<Withdraw>, escrow_payment_bump: u8, amount: u64) -> Result<()> {
    let wallet = &ctx.accounts.wallet;
    let receipt_account = &ctx.accounts.receipt_account;
    let escrow_payment_account = &ctx.accounts.escrow_payment_account;
    let authority = &ctx.accounts.authority;
    let auction_house = &ctx.accounts.auction_house;
    let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
    let treasury_mint = &ctx.accounts.treasury_mint;
    let token_mint = &ctx.accounts.token_mint;
    let system_program = &ctx.accounts.system_program;
    let token_program = &ctx.accounts.token_program;
    let ata_program = &ctx.accounts.ata_program;
    let rent = &ctx.accounts.rent;

    return withdraw_helper(
        wallet,
        receipt_account,
        escrow_payment_account,
        authority,
        auction_house,
        auction_house_fee_account,
        &treasury_mint.to_account_info(),
        token_mint,
        system_program,
        token_program,
        ata_program,
        rent,
        escrow_payment_bump,
        amount,
        true,
    );
}
