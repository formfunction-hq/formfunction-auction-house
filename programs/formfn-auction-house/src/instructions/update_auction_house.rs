use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token},
};

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError};

#[derive(Accounts)]
pub struct UpdateAuctionHouse<'info> {
    treasury_mint: Account<'info, Mint>,
    payer: Signer<'info>,
    authority: Signer<'info>,
    /// CHECK: No need to deserialize.
    new_authority: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    fee_withdrawal_destination: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    treasury_withdrawal_destination: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    treasury_withdrawal_destination_owner: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = authority,
        has_one = treasury_mint,
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
    ata_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
}

pub fn handle_update_auction_house(
    ctx: Context<UpdateAuctionHouse>,
    seller_fee_basis_points: Option<u16>,
    requires_sign_off: Option<bool>,
    can_change_sale_price: Option<bool>,
    seller_fee_basis_points_secondary: Option<u16>,
    pay_all_fees: Option<bool>,
) -> Result<()> {
    let treasury_mint = &ctx.accounts.treasury_mint;
    let payer = &ctx.accounts.payer;
    let new_authority = &ctx.accounts.new_authority;
    let auction_house = &mut ctx.accounts.auction_house;
    let fee_withdrawal_destination = &ctx.accounts.fee_withdrawal_destination;
    let treasury_withdrawal_destination_owner = &ctx.accounts.treasury_withdrawal_destination_owner;
    let treasury_withdrawal_destination = &ctx.accounts.treasury_withdrawal_destination;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let ata_program = &ctx.accounts.ata_program;
    let rent = &ctx.accounts.rent;
    let is_native = treasury_mint.key() == spl_token::native_mint::id();

    if let Some(sfbp) = seller_fee_basis_points {
        if sfbp > 10000 {
            return Err(AuctionHouseError::InvalidBasisPoints.into());
        }

        auction_house.seller_fee_basis_points = sfbp;
    }

    if let Some(sfbp) = seller_fee_basis_points_secondary {
        if sfbp > 10000 {
            return Err(AuctionHouseError::InvalidBasisPoints.into());
        }

        auction_house.seller_fee_basis_points_secondary = sfbp;
    }

    if let Some(rqf) = requires_sign_off {
        auction_house.requires_sign_off = rqf;
    }
    if let Some(chsp) = can_change_sale_price {
        auction_house.can_change_sale_price = chsp;
    }
    if let Some(pay_all_fees_val) = pay_all_fees {
        auction_house.pay_all_fees = pay_all_fees_val;
    }

    auction_house.authority = new_authority.key();
    auction_house.treasury_withdrawal_destination = treasury_withdrawal_destination.key();
    auction_house.fee_withdrawal_destination = fee_withdrawal_destination.key();

    if !is_native {
        if treasury_withdrawal_destination.data_is_empty() {
            make_ata(
                treasury_withdrawal_destination.to_account_info(),
                treasury_withdrawal_destination_owner.to_account_info(),
                treasury_mint.to_account_info(),
                payer.to_account_info(),
                ata_program.to_account_info(),
                token_program.to_account_info(),
                system_program.to_account_info(),
                rent.to_account_info(),
                &[],
            )?;
        }

        assert_is_ata(
            &treasury_withdrawal_destination.to_account_info(),
            &treasury_withdrawal_destination_owner.key(),
            &treasury_mint.key(),
        )?;
    } else {
        assert_keys_equal(
            treasury_withdrawal_destination.key(),
            treasury_withdrawal_destination_owner.key(),
        )?;
    }

    Ok(())
}
