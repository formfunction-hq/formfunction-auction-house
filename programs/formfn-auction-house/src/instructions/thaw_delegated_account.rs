use anchor_lang::{prelude::*, solana_program::program::invoke_signed};
use anchor_spl::token::{self, Token, TokenAccount};

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError};

#[derive(Accounts)]
#[instruction(program_as_signer_bump: u8)]
pub struct ThawDelegatedAccount<'info> {
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    seller: UncheckedAccount<'info>,
    #[account(
        mut,
        owner = token::ID
    )]
    token_account: Account<'info, TokenAccount>,
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
    // Says required account is missing when trying to run without this
    token_program: Program<'info, Token>,
    /// CHECK: No need to deserialize.
    master_edition: UncheckedAccount<'info>,
    #[account(address = mpl_token_metadata::id())]
    /// CHECK: No need to deserialize.
    metaplex_token_metadata_program: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    token_mint: UncheckedAccount<'info>,
    #[account(
        has_one = authority,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            auction_house.treasury_mint.as_ref()
        ],
        bump = auction_house.bump,
    )]
    auction_house: Account<'info, AuctionHouse>,
}

pub fn handle_thaw_delegated_account<'info>(
    ctx: Context<'_, '_, '_, 'info, ThawDelegatedAccount<'info>>,
    program_as_signer_bump: u8,
) -> Result<()> {
    let authority = &ctx.accounts.authority;
    let seller = &ctx.accounts.seller;
    let token_account = &ctx.accounts.token_account;
    let token_mint = &ctx.accounts.token_mint;
    let program_as_signer = &ctx.accounts.program_as_signer;
    let master_edition = &ctx.accounts.master_edition;
    let metaplex_token_metadata_program = &ctx.accounts.metaplex_token_metadata_program;
    let auction_house = &ctx.accounts.auction_house;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    assert_keys_equal(token_mint.key(), token_account.mint)?;
    assert_token_account_owner(token_account.owner, seller.key())?;

    if !token_account.is_frozen() {
        return Ok(());
    }

    let authority_clone = authority.to_account_info();
    if !authority_clone.is_signer && !seller.is_signer {
        return Err(AuctionHouseError::SellerOrAuctionHouseMustSign.into());
    }

    let program_as_signer_seeds = [
        PREFIX.as_bytes(),
        SIGNER.as_bytes(),
        &[program_as_signer_bump],
    ];

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

    Ok(())
}
