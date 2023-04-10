use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount};

use crate::{
    constants::*, utils::*, AuctionHouseError, EditionDistributor, PriceFunction,
    PriceFunctionType, EDITION_DISTRIBUTOR_SIZE,
};

#[derive(Accounts)]
pub struct CreateEditionDistributor<'info> {
    #[account(mut)]
    owner: Signer<'info>,
    #[account(owner = token::ID)]
    mint: Account<'info, Mint>,
    #[account(
        owner = token::ID,
        has_one = owner,
        has_one = mint,
        constraint = token_account.amount == 1
    )]
    token_account: Account<'info, TokenAccount>,
    /// CHECK: Validated in instruction handler.
    #[account()]
    master_edition: UncheckedAccount<'info>,
    #[account(
        init,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            mint.key().as_ref()
        ],
        payer = owner,
        space = EDITION_DISTRIBUTOR_SIZE,
        bump,
    )]
    edition_distributor: Account<'info, EditionDistributor>,
    system_program: Program<'info, System>,
    treasury_mint: Account<'info, Mint>,
}

pub fn handle_create_edition_distributor<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateEditionDistributor<'info>>,
    edition_bump: u8,
    starting_price_lamports: u64,
    price_function_type: PriceFunctionType,
    price_params: Vec<f64>,
    allowlist_sale_start_time: Option<i64>,
    public_sale_start_time: Option<i64>, // 0 if no public sale start time. If None, defaults to the current time.
    sale_end_time: Option<i64>,
    allowlist_sale_price: Option<u64>,
) -> Result<()> {
    if price_params.len() > MAX_NUMBER_OF_PRICE_PARAMS {
        return Err(AuctionHouseError::TooManyPriceParams.into());
    }

    if allowlist_sale_price.is_some() && allowlist_sale_start_time.is_none() {
        return Err(AuctionHouseError::InvalidAllowlistSalePrice.into());
    }

    let owner = &ctx.accounts.owner;
    let mint = &ctx.accounts.mint;
    let master_edition = &ctx.accounts.master_edition;
    let edition_distributor = &mut ctx.accounts.edition_distributor;
    let treasury_mint = &ctx.accounts.treasury_mint;

    let clock = Clock::get()?;
    let start_time_val = public_sale_start_time.unwrap_or(clock.unix_timestamp);
    assert_valid_edition_sale_times(
        allowlist_sale_start_time,
        start_time_val,
        sale_end_time,
        clock.unix_timestamp,
    )?;

    let derivation_result = assert_pda_derivation(
        &mpl_token_metadata::id(),
        &master_edition.to_account_info(),
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            mint.key().as_ref(),
            mpl_token_metadata::state::EDITION.as_bytes(),
            &[edition_bump],
        ],
    );

    if let Err(_e) = derivation_result {
        return Err(AuctionHouseError::InvalidMasterEditionAccount.into());
    }

    let master_edition = mpl_token_metadata::state::get_master_edition(master_edition)?;
    let edition = (*master_edition).supply();

    if edition != 0 {
        return Err(AuctionHouseError::InvalidMasterEditionSupply.into());
    }

    let distributor_bump = *ctx.bumps.get("edition_distributor").unwrap();
    edition_distributor.bump = distributor_bump;
    edition_distributor.master_edition_mint = mint.key();
    edition_distributor.owner = owner.key();
    edition_distributor.price_function = PriceFunction {
        starting_price_lamports,
        price_function_type,
        params: price_params,
    };
    edition_distributor.allowlist_sale_start_time = allowlist_sale_start_time;
    edition_distributor.allowlist_sale_price = allowlist_sale_price;
    edition_distributor.public_sale_start_time = start_time_val;
    edition_distributor.sale_end_time = sale_end_time;
    edition_distributor.anti_bot_protection_enabled = false;
    edition_distributor.limit_per_address = 0;
    edition_distributor.treasury_mint = treasury_mint.key();
    edition_distributor.allowlist_number_sold = 0;

    Ok(())
}
