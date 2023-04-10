use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount};
use std::convert::TryFrom;

use crate::{
    constants::*, utils::*, AuctionHouse, AuctionHouseError, TRADE_STATE_SIZE, TRADE_STATE_SIZE_U16,
};

#[derive(Accounts)]
#[instruction(trade_state_bump: u8, buyer_price: u64, token_size: u64)]
pub struct CreateTradeState<'info> {
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    wallet: UncheckedAccount<'info>,
    token_mint: Account<'info, Mint>,
    #[account(owner=token::ID)]
    token_account: Account<'info, TokenAccount>,
    #[account(
        has_one = authority,
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
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            wallet.key().as_ref(),
            auction_house.key().as_ref(),
            token_account.key().as_ref(),
            auction_house.treasury_mint.as_ref(),
            token_mint.key().as_ref(),
            &buyer_price.to_le_bytes(),
            &token_size.to_le_bytes()
        ],
        bump = trade_state_bump
    )]
    trade_state: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

pub fn handle_create_trade_state<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateTradeState<'info>>,
    trade_state_bump: u8,
    price: u64,
    token_size: u64,
    sale_type: u8,
    trade_state_size: Option<u16>,
) -> Result<()> {
    let wallet = &ctx.accounts.wallet;
    let authority = &ctx.accounts.authority;
    let token_mint = &ctx.accounts.token_mint;
    let token_account = &ctx.accounts.token_account;
    let auction_house = &ctx.accounts.auction_house;
    let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
    let trade_state = &mut ctx.accounts.trade_state;
    let system_program = &ctx.accounts.system_program;
    let rent = &ctx.accounts.rent;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    let size = usize::try_from(trade_state_size.unwrap_or(TRADE_STATE_SIZE_U16));
    let trade_state_allocation_size = match size {
        Ok(size) => size,
        Err(_err) => TRADE_STATE_SIZE,
    };

    assert_keys_equal(token_mint.key(), token_account.mint)?;

    if !wallet.to_account_info().is_signer && !authority.to_account_info().is_signer {
        return Err(AuctionHouseError::NoValidSignerPresent.into());
    }
    if token_account.amount < 1 {
        return Err(AuctionHouseError::InvalidTokenAccountAmount.into());
    }
    let ts_info = trade_state.to_account_info();
    if !ts_info.data_is_empty() {
        return Err(AuctionHouseError::TradeStateAlreadyInitialized.into());
    }

    let auction_house_key = auction_house.key();
    let seeds = [
        PREFIX.as_bytes(),
        auction_house_key.as_ref(),
        FEE_PAYER.as_bytes(),
        &[auction_house.fee_payer_bump],
    ];
    let (fee_payer, fee_seeds) = get_fee_payer(
        authority,
        auction_house,
        wallet.to_account_info(),
        auction_house_fee_account.to_account_info(),
        &seeds,
    )?;
    let token_account_key = token_account.key();
    let wallet_key = wallet.key();
    let ts_seeds = [
        PREFIX.as_bytes(),
        wallet_key.as_ref(),
        auction_house_key.as_ref(),
        token_account_key.as_ref(),
        auction_house.treasury_mint.as_ref(),
        token_account.mint.as_ref(),
        &price.to_le_bytes(),
        &token_size.to_le_bytes(),
        &[trade_state_bump],
    ];
    create_or_allocate_account_raw(
        *ctx.program_id,
        &ts_info,
        &rent.to_account_info(),
        &system_program,
        &fee_payer,
        trade_state_allocation_size,
        fee_seeds,
        &ts_seeds,
    )?;

    let data = &mut ts_info.data.borrow_mut();
    data[0] = trade_state_bump;
    if trade_state_allocation_size > (1 as usize) {
        data[1] = sale_type;
    }

    Ok(())
}
