use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::{constants::*, utils::*, AuctionHouseError, EditionDistributor, PriceFunctionType};

#[derive(Accounts)]
pub struct UpdateEditionDistributor<'info> {
    #[account(mut)]
    owner: Signer<'info>,
    #[account()]
    mint: Account<'info, Mint>,
    /// CHECK: Validated in instruction handler.
    #[account()]
    master_edition: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = owner,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            mint.key().as_ref()
        ],
        bump = edition_distributor.bump,
    )]
    edition_distributor: Account<'info, EditionDistributor>,
    treasury_mint: Account<'info, Mint>,
}

pub fn handle_update_edition_distributor<'info>(
    ctx: Context<'_, '_, '_, 'info, UpdateEditionDistributor<'info>>,
    edition_bump: u8,
    starting_price_lamports: Option<u64>,
    price_function_type: Option<PriceFunctionType>,
    price_params: Option<Vec<f64>>,
    new_owner: Option<Pubkey>,
    allowlist_sale_start_time: Option<i64>,
    public_sale_start_time: Option<i64>, // 0 if no public sale start time. If None, defaults to the current time.
    sale_end_time: Option<i64>,
    allowlist_sale_price: Option<u64>,
) -> Result<()> {
    if allowlist_sale_price.is_some() && allowlist_sale_start_time.is_none() {
        return Err(AuctionHouseError::InvalidAllowlistSalePrice.into());
    }

    let edition_distributor = &mut ctx.accounts.edition_distributor;
    let mint = &ctx.accounts.mint;
    let master_edition = &ctx.accounts.master_edition;

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
        // You can only modify the distributor if no editions have been minted yet.
        return Err(AuctionHouseError::InvalidMasterEditionSupply.into());
    }

    if let Some(starting_price_lamports_val) = starting_price_lamports {
        msg!("Updated the starting price");
        edition_distributor.price_function.starting_price_lamports = starting_price_lamports_val;
    }

    if let Some(price_function_type_val) = price_function_type {
        msg!("Updated the price function type");
        edition_distributor.price_function.price_function_type = price_function_type_val;
    }

    if let Some(price_params_val) = price_params {
        if price_params_val.len() > MAX_NUMBER_OF_PRICE_PARAMS {
            return Err(AuctionHouseError::TooManyPriceParams.into());
        }
        msg!("Updated the price params");
        edition_distributor.price_function.params = price_params_val;
    }

    if let Some(new_owner_val) = new_owner {
        msg!("Updated the owner");
        edition_distributor.owner = new_owner_val;
    }

    edition_distributor.allowlist_sale_start_time = allowlist_sale_start_time;
    edition_distributor.public_sale_start_time = start_time_val;
    edition_distributor.sale_end_time = sale_end_time;
    edition_distributor.allowlist_sale_price = allowlist_sale_price;

    Ok(())
}
