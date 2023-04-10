use anchor_lang::{prelude::*, solana_program::program::invoke_signed};
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError, TradeStateSaleType};

// Accepts additional accounts compared to Cancel to support
// mpl_token_metadata::instruction::thaw_delegated_account call
#[derive(Accounts)]
#[instruction(buyer_price: u64, token_size: u64, program_as_signer_bump: u8)]
pub struct CancelV2<'info> {
    /// CHECK: No need to deserialize.
    #[account(mut)]
    wallet: UncheckedAccount<'info>,
    #[account(mut, owner = token::ID)]
    token_account: Account<'info, TokenAccount>,
    token_mint: Account<'info, Mint>,
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
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
        bump = trade_state.to_account_info().data.borrow()[0]
    )]
    trade_state: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    /// CHECK: No need to deserialize.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            SIGNER.as_bytes()
        ],
        bump = program_as_signer_bump
    )]
    program_as_signer: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    master_edition: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(address=mpl_token_metadata::id())]
    metaplex_token_metadata_program: UncheckedAccount<'info>,
}

pub fn handle_cancel_v2(
    ctx: Context<CancelV2>,
    _buyer_price: u64,
    _token_size: u64,
    program_as_signer_bump: u8,
) -> Result<()> {
    let wallet = &ctx.accounts.wallet;
    let token_account = &ctx.accounts.token_account;
    let token_mint = &ctx.accounts.token_mint;
    let authority = &ctx.accounts.authority;
    let auction_house = &ctx.accounts.auction_house;
    let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
    let trade_state = &ctx.accounts.trade_state;
    let token_program = &ctx.accounts.token_program;
    let program_as_signer = &ctx.accounts.program_as_signer;
    let master_edition = &ctx.accounts.master_edition;
    let metaplex_token_metadata_program = &ctx.accounts.metaplex_token_metadata_program;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    assert_keys_equal(token_mint.key(), token_account.mint)?;
    let sale_type = get_trade_state_sale_type(&trade_state.to_account_info());
    msg!("sale_type = {}", sale_type);

    if !wallet.to_account_info().is_signer && !authority.to_account_info().is_signer {
        return Err(AuctionHouseError::NoValidSignerPresent.into());
    }

    let auction_house_key = auction_house.key();
    let seeds = [
        PREFIX.as_bytes(),
        auction_house_key.as_ref(),
        FEE_PAYER.as_bytes(),
        &[auction_house.fee_payer_bump],
    ];

    let (fee_payer, _) = get_fee_payer(
        authority,
        auction_house,
        wallet.to_account_info(),
        auction_house_fee_account.to_account_info(),
        &seeds,
    )?;

    let curr_lamp = trade_state.lamports();
    **trade_state.lamports.borrow_mut() = 0;

    **fee_payer.lamports.borrow_mut() = fee_payer
        .lamports()
        .checked_add(curr_lamp)
        .ok_or(AuctionHouseError::NumericalOverflow)?;

    // First thaw account
    let program_as_signer_seeds = [
        PREFIX.as_bytes(),
        SIGNER.as_bytes(),
        &[program_as_signer_bump],
    ];

    // NOTE: if the user manually assigns another delegate to the token account
    // and then attempts to delist, this will fail (since the Auction House program
    // would no longer be the delegate). Further, a token_account.is_frozen() check
    // won't suffice since the user could manually freeze the account as well.
    // We don't think this should ever happen but making a note just in case.
    if token_account.is_frozen() && sale_type != TradeStateSaleType::Offer {
        // Do not thaw if someone is cancelling an offer
        invoke_signed(
            &mpl_token_metadata::instruction::thaw_delegated_account(
                mpl_token_metadata::id(),
                program_as_signer.key(),
                token_account.key(),
                master_edition.key(),
                token_mint.key(),
            ),
            &[
                program_as_signer.to_account_info(),
                token_account.to_account_info(),
                master_edition.to_account_info(),
                token_mint.to_account_info(),
                metaplex_token_metadata_program.to_account_info(),
            ],
            &[&program_as_signer_seeds],
        )?;
    }

    if token_account.owner == wallet.key() && wallet.is_signer {
        return revoke_helper(
            &token_program.to_account_info(),
            &token_account.to_account_info(),
            &wallet.to_account_info(),
            &trade_state.to_account_info(),
            &fee_payer,
        );
    }

    Ok(())
}
