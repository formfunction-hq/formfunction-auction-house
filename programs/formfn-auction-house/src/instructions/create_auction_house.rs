use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token},
};

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError, AUCTION_HOUSE_SIZE};

#[derive(Accounts)]
#[instruction(bump: u8, fee_payer_bump: u8, treasury_bump: u8)]
pub struct CreateAuctionHouse<'info> {
    treasury_mint: Account<'info, Mint>,
    #[account(mut)]
    payer: Signer<'info>,
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    fee_withdrawal_destination: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    treasury_withdrawal_destination: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    treasury_withdrawal_destination_owner: UncheckedAccount<'info>,
    #[account(
        init,
        seeds = [
            PREFIX.as_bytes(),
            authority.key().as_ref(),
            treasury_mint.key().as_ref()
        ],
        payer = payer,
        space = AUCTION_HOUSE_SIZE,
        bump,
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
        bump = fee_payer_bump
    )]
    auction_house_fee_account: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.key().as_ref(),
            TREASURY.as_bytes()
        ],
        bump = treasury_bump
    )]
    auction_house_treasury: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    ata_program: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
}

pub fn handle_create_auction_house(
    ctx: Context<CreateAuctionHouse>,
    bump: u8,
    fee_payer_bump: u8,
    treasury_bump: u8,
    seller_fee_basis_points: u16,
    requires_sign_off: bool,
    can_change_sale_price: bool,
    seller_fee_basis_points_secondary: u16,
    pay_all_fees: bool,
) -> Result<()> {
    let treasury_mint = &ctx.accounts.treasury_mint;
    let payer = &ctx.accounts.payer;
    let authority = &ctx.accounts.authority;
    let auction_house = &mut ctx.accounts.auction_house;
    let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
    let auction_house_treasury = &ctx.accounts.auction_house_treasury;
    let fee_withdrawal_destination = &ctx.accounts.fee_withdrawal_destination;
    let treasury_withdrawal_destination_owner = &ctx.accounts.treasury_withdrawal_destination_owner;
    let treasury_withdrawal_destination = &ctx.accounts.treasury_withdrawal_destination;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let ata_program = &ctx.accounts.ata_program;
    let rent = &ctx.accounts.rent;

    auction_house.bump = bump;
    auction_house.fee_payer_bump = fee_payer_bump;
    auction_house.treasury_bump = treasury_bump;
    if seller_fee_basis_points > 10000 || seller_fee_basis_points_secondary > 10000 {
        return Err(AuctionHouseError::InvalidBasisPoints.into());
    }
    auction_house.seller_fee_basis_points = seller_fee_basis_points;
    auction_house.seller_fee_basis_points_secondary = seller_fee_basis_points_secondary;
    auction_house.requires_sign_off = requires_sign_off;
    auction_house.can_change_sale_price = can_change_sale_price;
    auction_house.creator = authority.key();
    auction_house.authority = authority.key();
    auction_house.treasury_mint = treasury_mint.key();
    auction_house.auction_house_fee_account = auction_house_fee_account.key();
    auction_house.auction_house_treasury = auction_house_treasury.key();
    auction_house.treasury_withdrawal_destination = treasury_withdrawal_destination.key();
    auction_house.fee_withdrawal_destination = fee_withdrawal_destination.key();
    auction_house.pay_all_fees = pay_all_fees;

    let is_native = treasury_mint.key() == spl_token::native_mint::id();

    let ah_key = auction_house.key();

    let auction_house_treasury_seeds = [
        PREFIX.as_bytes(),
        ah_key.as_ref(),
        TREASURY.as_bytes(),
        &[treasury_bump],
    ];

    create_program_token_account_if_not_present(
        auction_house_treasury,
        system_program,
        &payer,
        token_program,
        &treasury_mint.to_account_info(),
        &auction_house.to_account_info(),
        rent,
        &auction_house_treasury_seeds,
        &[],
        is_native,
    )?;

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
