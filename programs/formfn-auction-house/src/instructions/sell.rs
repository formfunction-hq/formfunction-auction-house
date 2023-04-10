use anchor_lang::{
    prelude::*,
    solana_program::program::{invoke, invoke_signed},
};
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use spl_token::instruction::approve;

use crate::{constants::*, utils::*, AuctionHouse, AuctionHouseError};

#[derive(Accounts)]
#[instruction(trade_state_bump: u8, free_trade_state_bump: u8, program_as_signer_bump: u8, buyer_price: u64, token_size: u64)]
pub struct Sell<'info> {
    /// CHECK: No need to deserialize.
    wallet: UncheckedAccount<'info>,
    #[account(
        mut,
        owner = token::ID
    )]
    token_account: Account<'info, TokenAccount>,
    /// CHECK: No need to deserialize.
    metadata: UncheckedAccount<'info>,
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
            token_account.mint.as_ref(),
            &buyer_price.to_le_bytes(),
            &token_size.to_le_bytes()
        ],
        bump = trade_state_bump
    )]
    seller_trade_state: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            wallet.key().as_ref(),
            auction_house.key().as_ref(),
            token_account.key().as_ref(),
            auction_house.treasury_mint.as_ref(),
            token_account.mint.as_ref(),
            &0u64.to_le_bytes(),
            &token_size.to_le_bytes()
        ],
        bump = free_trade_state_bump
    )]
    free_seller_trade_state: UncheckedAccount<'info>,
    // 9th account, new accounts should go below this to not mess up tx parsing (see parseSellTx.ts in monorepo)
    token_mint: Account<'info, Mint>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
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
    rent: Sysvar<'info, Rent>,
    /// CHECK: No need to deserialize.
    master_edition: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(address = mpl_token_metadata::id())]
    metaplex_token_metadata_program: UncheckedAccount<'info>,
}

pub fn handle_sell<'info>(
    ctx: Context<'_, '_, '_, 'info, Sell<'info>>,
    trade_state_bump: u8,
    _free_trade_state_bump: u8,
    program_as_signer_bump: u8,
    buyer_price: u64,
    token_size: u64,
) -> Result<()> {
    let wallet = &ctx.accounts.wallet;
    let token_account = &ctx.accounts.token_account;
    let metadata = &ctx.accounts.metadata;
    let authority = &ctx.accounts.authority;
    let seller_trade_state = &ctx.accounts.seller_trade_state;
    let free_seller_trade_state = &ctx.accounts.free_seller_trade_state;
    let auction_house = &ctx.accounts.auction_house;
    let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
    let token_mint = &ctx.accounts.token_mint;
    let token_program = &ctx.accounts.token_program;
    let system_program = &ctx.accounts.system_program;
    let program_as_signer = &ctx.accounts.program_as_signer;
    let rent = &ctx.accounts.rent;
    let master_edition = &ctx.accounts.master_edition;
    let metaplex_token_metadata_program = &ctx.accounts.metaplex_token_metadata_program;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    let sale_type = get_trade_state_sale_type(&seller_trade_state.to_account_info());
    msg!("seller_sale_type = {}", sale_type);
    assert_keys_equal(token_mint.key(), token_account.mint)?;
    assert_token_account_owner(token_account.owner, wallet.key())?;

    if !wallet.to_account_info().is_signer {
        if buyer_price == 0 {
            return Err(AuctionHouseError::SaleRequiresSigner.into());
        } else {
            if free_seller_trade_state.data_is_empty() {
                return Err(AuctionHouseError::SaleRequiresSigner.into());
            } else if !free_seller_trade_state.data_is_empty()
                && (!authority.to_account_info().is_signer || !auction_house.can_change_sale_price)
            {
                return Err(AuctionHouseError::SaleRequiresSigner.into());
            }
        }
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

    assert_metadata_valid(metadata, token_account)?;

    if token_size > token_account.amount {
        return Err(AuctionHouseError::InvalidTokenAmount.into());
    }

    if wallet.is_signer {
        invoke(
            &approve(
                &token_program.key(),
                &token_account.key(),
                &program_as_signer.key(),
                &wallet.key(),
                &[],
                token_size,
            )
            .unwrap(),
            &[
                token_program.to_account_info(),
                token_account.to_account_info(),
                program_as_signer.to_account_info(),
                wallet.to_account_info(),
            ],
        )?;
    }

    let ts_info = seller_trade_state.to_account_info();
    if ts_info.data_is_empty() {
        let token_account_key = token_account.key();
        let wallet_key = wallet.key();
        let ts_seeds = [
            PREFIX.as_bytes(),
            wallet_key.as_ref(),
            auction_house_key.as_ref(),
            token_account_key.as_ref(),
            auction_house.treasury_mint.as_ref(),
            token_account.mint.as_ref(),
            &buyer_price.to_le_bytes(),
            &token_size.to_le_bytes(),
            &[trade_state_bump],
        ];
        create_or_allocate_account_raw(
            *ctx.program_id,
            &ts_info,
            &rent.to_account_info(),
            &system_program,
            &fee_payer,
            1 as usize,
            fee_seeds,
            &ts_seeds,
        )?;
    }

    let data = &mut ts_info.data.borrow_mut();
    data[0] = trade_state_bump;

    let program_as_signer_seeds = [
        PREFIX.as_bytes(),
        SIGNER.as_bytes(),
        &[program_as_signer_bump],
    ];

    if !token_account.is_frozen() {
        invoke_signed(
            &mpl_token_metadata::instruction::freeze_delegated_account(
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

    Ok(())
}
