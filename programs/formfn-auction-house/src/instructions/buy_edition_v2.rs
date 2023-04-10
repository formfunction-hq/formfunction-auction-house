use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token},
};
use mpl_token_metadata::state::{get_master_edition, TokenMetadataAccount};
use spl_token::instruction::{initialize_mint, mint_to};

use crate::{
    constants::*, utils::*, AuctionHouse, AuctionHouseError, EditionAllowlistSettings,
    EditionBuyerInfoAccount, EditionDistributor, PriceFunctionType,
    EDITION_BUYER_INFO_ACCOUNT_SPACE,
};

#[derive(Accounts)]
pub struct BuyEditionV2<'info> {
    /// CHECK: No need to parse
    #[account(mut)]
    owner: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = owner,
        seeds = [
            EDITION_DISTRIBUTOR.as_bytes(),
            mint.key().as_ref()
        ],
        bump = edition_distributor.bump,
    )]
    edition_distributor: Box<Account<'info, EditionDistributor>>,
    #[account()]
    mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    buyer: Signer<'info>,
    treasury_mint: Box<Account<'info, Mint>>,
    /// CHECK: No need to deserialize.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.key().as_ref(),
            TREASURY.as_bytes()
        ],
        bump = auction_house.treasury_bump
    )]
    auction_house_treasury: UncheckedAccount<'info>,
    #[account(mut,
        has_one = treasury_mint,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.creator.as_ref(),
            treasury_mint.key().as_ref()
        ],
        bump = auction_house.bump,
    )]
    auction_house: Box<Account<'info, AuctionHouse>>,
    /// Master edition mint metadata account.
    /// CHECK: Account is passed through to mpl program.
    master_edition_metadata: UncheckedAccount<'info>,
    /// Edition account of the master edition mint.
    /// CHECK: Account is passed through to mpl program.
    #[account(mut)]
    master_edition_pda: UncheckedAccount<'info>,
    /// New mint address for the claim limited edition print.
    /// CHECK: Account is passed through to mpl program.
    #[account(mut)]
    limited_edition_mint: Signer<'info>,
    /// Metadata account of the new limited edition mint.
    /// CHECK: Account is passed through to mpl program.
    #[account(mut)]
    limited_edition_metadata: UncheckedAccount<'info>,
    /// Edition account of the new limited edition mint.
    /// CHECK: Account is passed through to mpl program.
    #[account(mut)]
    limited_edition_pda: UncheckedAccount<'info>,
    /// Edition marker PDA.
    /// CHECK: Account is passed through to mpl program.
    #[account(mut)]
    edition_marker_pda: UncheckedAccount<'info>,
    /// Distributor token account for the master edition mint.
    /// CHECK: Account is passed through to mpl program.
    master_edition_token_account: UncheckedAccount<'info>,
    /// SPL [TokenMetadata] program.
    /// CHECK: Account is passed through to mpl program.
    token_metadata_program: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    /// CHECK: Validated in the instruction handler.
    anti_bot_authority: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    authority: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(
        mut,
        seeds = [
            PREFIX.as_bytes(),
            auction_house.key().as_ref(),
            FEE_PAYER.as_bytes()
        ],
        bump
    )]
    auction_house_fee_account: UncheckedAccount<'info>,
    ata_program: Program<'info, AssociatedToken>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    buyer_token_account: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    buyer_payment_token_account: UncheckedAccount<'info>,
    /// CHECK: No need to deserialize.
    #[account(mut)]
    seller_payment_receipt_token_account: UncheckedAccount<'info>,
    /// CHECK: This account is validated in the instruction handler. We don't deserialize
    // it with Anchor here because it doesn't exist for every edition purchase.
    #[account(
        mut,
        seeds = [
            EDITION_BUYER_INFO_ACCOUNT.as_bytes(),
            mint.key().as_ref(),
            buyer.key().as_ref()],
        bump
    )]
    edition_buyer_info_account: UncheckedAccount<'info>,
    /// CHECK: This account is validated in the instruction handler. We don't deserialize
    // it with Anchor here because it doesn't exist for every edition purchase.
    #[account(
        seeds = [
            EDITION_ALLOWLIST.as_bytes(),
            edition_distributor.key().as_ref()
        ],
        bump
    )]
    edition_allowlist_settings: UncheckedAccount<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct BuyerMerkleAllowlistProofData {
    pub amount: u16,
    pub proof: Vec<[u8; 32]>,
    pub root_index_for_proof: u16,
}

pub fn handle_buy_edition_v2<'info>(
    ctx: Context<'_, '_, '_, 'info, BuyEditionV2<'info>>,
    edition_bump: u8,
    // Currently unused, but keep it as an arg in case we ever want to start using it
    _requested_edition_number: u64,
    // The price the buyer pays. Validated inside this instruction
    price_in_lamports: u64,
    buyer_edition_info_account_bump: u8,
    buyer_merkle_allowlist_proof_data: Option<BuyerMerkleAllowlistProofData>,
) -> Result<()> {
    let owner = &ctx.accounts.owner;
    let anti_bot_authority = &ctx.accounts.anti_bot_authority;
    let auction_house_treasury = &ctx.accounts.auction_house_treasury;
    let auction_house = &ctx.accounts.auction_house;
    let buyer = &ctx.accounts.buyer;
    let edition_distributor = &ctx.accounts.edition_distributor;
    let master_edition_pda = &ctx.accounts.master_edition_pda;
    let system_program = &ctx.accounts.system_program;
    let limited_edition_mint = &ctx.accounts.limited_edition_mint;
    let master_edition_metadata = &ctx.accounts.master_edition_metadata;
    let treasury_mint = &ctx.accounts.treasury_mint;
    let authority = &ctx.accounts.authority;
    let auction_house_fee_account = &ctx.accounts.auction_house_fee_account;
    let ata_program = &ctx.accounts.ata_program;
    let token_program = &ctx.accounts.token_program;
    let rent = &ctx.accounts.rent;
    let buyer_token_account = &ctx.accounts.buyer_token_account;
    // TODO(@bryancho): add validation to check that the mint equals treasury mint key
    let buyer_payment_token_account = &ctx.accounts.buyer_payment_token_account;
    let seller_payment_receipt_token_account = &ctx.accounts.seller_payment_receipt_token_account;
    let mint = &ctx.accounts.mint;
    let edition_buyer_info_account = &ctx.accounts.edition_buyer_info_account;
    let edition_allowlist_settings = &ctx.accounts.edition_allowlist_settings;

    assert_valid_auction_house(ctx.program_id, &auction_house.key())?;

    let is_anti_bot_authority_valid =
        assert_valid_anti_bot_authority(ctx.program_id, &anti_bot_authority.key());

    if let Err(error) = is_anti_bot_authority_valid {
        punish_bots(
            error,
            buyer.to_account_info(),
            auction_house_treasury.to_account_info(),
            system_program.to_account_info(),
        )?;

        return Ok(());
    }

    if edition_distributor.anti_bot_protection_enabled && !anti_bot_authority.is_signer {
        let error_code = AuctionHouseError::InvalidAntiBotAuthority;
        punish_bots(
            error_code.into(),
            buyer.to_account_info(),
            auction_house_treasury.to_account_info(),
            system_program.to_account_info(),
        )?;

        return Ok(());
    }

    let clock = Clock::get()?;
    assert_valid_times_for_buy_edition(
        edition_distributor.allowlist_sale_start_time,
        edition_distributor.public_sale_start_time,
        edition_distributor.sale_end_time,
        clock.unix_timestamp,
    )?;

    assert_valid_treasury_mint_for_buy_edition(
        edition_distributor.treasury_mint,
        treasury_mint.key(),
    )?;

    // Verify the provided master edition metadata account.
    let derivation_result = assert_pda_derivation(
        &mpl_token_metadata::id(),
        &master_edition_pda.to_account_info(),
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

    let is_allowlist_sale = is_during_allowlist_sale(
        edition_distributor.allowlist_sale_start_time,
        edition_distributor.public_sale_start_time,
        clock.unix_timestamp,
    );

    let limit_per_address = edition_distributor.limit_per_address;

    // Create the EditionBuyerInfoAccount first if the edition has a limit_per_address
    // (note that 0 represents no limit) or if there is an allowlist sale.
    if is_allowlist_sale || limit_per_address > 0 {
        if edition_buyer_info_account.data_is_empty() {
            let signer_seeds = [
                EDITION_BUYER_INFO_ACCOUNT.as_bytes().as_ref(),
                &mint.key().to_bytes(),
                &buyer.key().to_bytes(),
                &[buyer_edition_info_account_bump],
            ];

            create_or_allocate_account_raw(
                *ctx.program_id,
                &edition_buyer_info_account,
                &rent.to_account_info(),
                &system_program,
                &buyer,
                EDITION_BUYER_INFO_ACCOUNT_SPACE as usize,
                &signer_seeds,
                &signer_seeds,
            )?;

            write_anchor_account_discriminator(
                &edition_buyer_info_account,
                &<EditionBuyerInfoAccount as anchor_lang::Discriminator>::discriminator(),
            )?;
        }
    }

    // If there is an allowlist sale, a valid allowlist proof must be provided.
    if is_allowlist_sale {
        if buyer_merkle_allowlist_proof_data.is_none() {
            return Err(AuctionHouseError::AllowlistProofRequired.into());
        }

        let proof_data = buyer_merkle_allowlist_proof_data.unwrap();
        let amount = proof_data.amount;
        let proof = proof_data.proof;
        let root_index_for_proof = proof_data.root_index_for_proof as usize;

        let edition_allowlist_settings_account: Account<EditionAllowlistSettings> =
            Account::try_from(&edition_allowlist_settings)?;

        let roots_list = &edition_allowlist_settings_account.merkle_roots;
        if roots_list.is_empty() {
            msg!("Invalid allowlist proof provided, the current roots list is empty.");
            return Err(AuctionHouseError::InvalidAllowlistProof.into());
        } else if root_index_for_proof >= roots_list.len() {
            msg!(
                "Invalid root_index_for_proof provided, received: {}, roots_list length = {}.",
                root_index_for_proof,
                roots_list.len()
            );
            return Err(AuctionHouseError::InvalidAllowlistProof.into());
        }

        let leaf = anchor_lang::solana_program::keccak::hashv(&[
            &[0x00],
            &buyer.key().to_bytes(),
            &mint.key().to_bytes(),
            &amount.to_le_bytes(),
        ]);

        let root: [u8; 32] = roots_list[root_index_for_proof];

        let is_proof_valid = verify_merkle_proof(&proof, root, leaf.0);
        if !is_proof_valid {
            msg!(
                "Invalid proof provided for root_index_for_proof: {}.",
                root_index_for_proof
            );
            return Err(AuctionHouseError::InvalidAllowlistProof.into());
        }

        let mut edition_buyer_info_account: Account<EditionBuyerInfoAccount> =
            Account::try_from(edition_buyer_info_account)?;

        require!(
            edition_buyer_info_account.number_bought_allowlist < amount,
            AuctionHouseError::AllowlistAmountAlreadyMinted
        );

        let number_bought_allowlist = edition_buyer_info_account
            .number_bought_allowlist
            .checked_add(1)
            .unwrap();

        edition_buyer_info_account.number_bought_allowlist = number_bought_allowlist;

        // This re-serializes the account to persist the changes.
        edition_buyer_info_account.exit(&crate::ID)?;

        msg!(
            "Valid merkle allowlist proof submitted by {} with root index {}.",
            buyer.key(),
            root_index_for_proof
        );
    }

    if !is_allowlist_sale && limit_per_address > 0 {
        let mut edition_buyer_info_account: Account<EditionBuyerInfoAccount> =
            Account::try_from(&edition_buyer_info_account)?;

        require!(
            edition_buyer_info_account.number_bought < limit_per_address,
            AuctionHouseError::EditionLimitPerAddressExceeded
        );

        let number_bought = edition_buyer_info_account
            .number_bought
            .checked_add(1)
            .unwrap();

        edition_buyer_info_account.number_bought = number_bought;

        // This re-serializes the account to persist the changes.
        edition_buyer_info_account.exit(&crate::ID)?;
    }

    let is_native = treasury_mint.key() == spl_token::native_mint::id();

    create_ata_for_buy_edition(
        buyer_token_account.to_account_info(),
        buyer.to_account_info(),
        limited_edition_mint.to_account_info(),
        ata_program.to_account_info(),
        token_program.to_account_info(),
        system_program.to_account_info(),
        rent.to_account_info(),
        &rent,
    )?;

    // We will mint the next available edition
    let master_edition = get_master_edition(master_edition_pda)?;
    let next_available_edition = (*master_edition).supply().checked_add(1).unwrap();

    mint_next_edition(
        ctx.accounts.token_metadata_program.to_account_info(),
        ctx.accounts.limited_edition_metadata.to_account_info(),
        ctx.accounts.limited_edition_pda.to_account_info(),
        ctx.accounts.master_edition_pda.to_account_info(),
        ctx.accounts.limited_edition_mint.to_account_info(),
        ctx.accounts.edition_marker_pda.to_account_info(),
        ctx.accounts.buyer.to_account_info(),
        ctx.accounts.edition_distributor.to_account_info(),
        ctx.accounts.master_edition_token_account.to_account_info(),
        ctx.accounts.owner.to_account_info(),
        ctx.accounts.master_edition_metadata.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.rent.to_account_info(),
        &edition_distributor.master_edition_mint,
        edition_distributor.bump,
        next_available_edition,
    )?;

    let price_for_edition = get_price_for_edition(
        next_available_edition,
        &edition_distributor.price_function,
        is_allowlist_sale,
        edition_distributor.allowlist_sale_price,
        edition_distributor.allowlist_number_sold,
    )?;

    if edition_distributor.price_function.price_function_type == PriceFunctionType::Minimum {
        if price_in_lamports < price_for_edition {
            msg!(
                "Invalid edition price: price_for_edition = {}, price_in_lamports = {}",
                price_for_edition,
                price_in_lamports
            );
            return Err(AuctionHouseError::InvalidEditionPrice.into());
        }
    } else {
        if price_for_edition != price_in_lamports {
            msg!(
                "Invalid edition price: price_for_edition = {}, price_in_lamports = {}",
                price_for_edition,
                price_in_lamports
            );
            return Err(AuctionHouseError::InvalidEditionPrice.into());
        }
    }

    // Take platform fee
    let total_fee = (auction_house.seller_fee_basis_points as u128)
        .checked_mul(price_in_lamports as u128)
        .ok_or(AuctionHouseError::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(AuctionHouseError::NumericalOverflow)? as u64;
    if !is_native {
        invoke_signed(
            &spl_token::instruction::transfer(
                token_program.key,
                &buyer_payment_token_account.key(),
                &auction_house_treasury.key(),
                &buyer.key(),
                &[],
                total_fee,
            )?,
            &[
                buyer_payment_token_account.to_account_info(),
                auction_house_treasury.to_account_info(),
                token_program.to_account_info(),
                buyer.to_account_info(),
            ],
            &[],
        )?;
    } else {
        invoke_signed(
            &system_instruction::transfer(buyer.key, auction_house_treasury.key, total_fee),
            &[
                buyer.to_account_info(),
                auction_house_treasury.to_account_info(),
                system_program.to_account_info(),
            ],
            &[],
        )?;
    }

    // Pay creators
    let buyer_leftover_after_fees = price_in_lamports
        .checked_sub(total_fee)
        .ok_or(AuctionHouseError::NumericalOverflow)?;

    let metadata = mpl_token_metadata::state::Metadata::from_account_info(
        &ctx.accounts.master_edition_metadata,
    )?;
    let should_split_primary =
        should_split_primary_sale(&metadata, &owner.key(), get_has_been_sold(&metadata, None));

    let auction_house_key = auction_house.key();
    let auction_house_fee_payer_seeds = [
        PREFIX.as_bytes(),
        auction_house_key.as_ref(),
        FEE_PAYER.as_bytes(),
        &[auction_house.fee_payer_bump],
    ];
    let (fee_payer, fee_payer_seeds) = get_fee_payer(
        authority,
        auction_house,
        buyer.to_account_info(),
        auction_house_fee_account.to_account_info(),
        &auction_house_fee_payer_seeds,
    )?;

    if should_split_primary {
        if !is_native {
            let auction_house_seeds = [
                PREFIX.as_bytes(),
                auction_house.creator.as_ref(),
                auction_house.treasury_mint.as_ref(),
                &[auction_house.bump],
            ];
            split_primary_sale_between_creators_non_native(
                &mut ctx.remaining_accounts.iter(),
                &master_edition_metadata,
                &buyer_payment_token_account,
                buyer,
                &fee_payer,
                &treasury_mint.to_account_info(),
                &ata_program,
                &token_program,
                &system_program,
                &rent.to_account_info(),
                &auction_house_seeds,
                &fee_payer_seeds,
                buyer_leftover_after_fees,
            )?;
        } else {
            let edition_distributor_seeds = [
                EDITION_DISTRIBUTOR.as_bytes(),
                &edition_distributor.master_edition_mint.to_bytes(),
                &[edition_distributor.bump],
            ];
            split_primary_sale_between_creators_native(
                &mut ctx.remaining_accounts.iter(),
                &master_edition_metadata,
                buyer,
                system_program,
                &edition_distributor_seeds,
                buyer_leftover_after_fees,
            )?;
        }
    } else {
        // Give rest to distributor creator
        let creator_payment_amount = price_in_lamports
            .checked_sub(total_fee)
            .ok_or(AuctionHouseError::NumericalOverflow)?;
        if !is_native {
            invoke_signed(
                &spl_token::instruction::transfer(
                    token_program.key,
                    &buyer_payment_token_account.key(),
                    &seller_payment_receipt_token_account.key(),
                    &buyer.key(),
                    &[],
                    creator_payment_amount,
                )?,
                &[
                    buyer_payment_token_account.to_account_info(),
                    seller_payment_receipt_token_account.to_account_info(),
                    token_program.to_account_info(),
                    buyer.to_account_info(),
                ],
                &[],
            )?;
        } else {
            invoke_signed(
                &system_instruction::transfer(&buyer.key, &owner.key, creator_payment_amount),
                &[
                    buyer.to_account_info(),
                    owner.to_account_info(),
                    system_program.to_account_info(),
                ],
                &[],
            )?;
        }
    }

    let master_edition_mint = edition_distributor.master_edition_mint.key();

    // This happens down here to avoid mutable borrow issues with the edition_distributor account.
    if is_allowlist_sale {
        let edition_distributor = &mut ctx.accounts.edition_distributor;

        // Increment the number sold for the allowlist.
        edition_distributor.allowlist_number_sold = edition_distributor
            .allowlist_number_sold
            .checked_add(1)
            .unwrap();
    }

    // NOTE: be careful when changing this log line! AuctionHouseSdk relies on it (see getEditionNumberFromTx).
    msg!(
        "Bought edition #{} for mint {}",
        next_available_edition,
        master_edition_mint
    );

    Ok(())
}

/**
 * The BuyEditionV2 instruction may blow the Solana runtime stack limits if too
 * much logic is contained in the body of the function, and produce runtime errors like:
 * 'Program failed to complete: Access violation in unknown section at address 0x0 of size 8 by instruction #20866'
 *
 * One workaround for this is to extract logic out to separate functions and annotate
 * them with #[inline(never)] which encourages the Rust compiler to *not inline
 * these functions in whatever parent function calls them (which otherwise it may do
 * as a speed optimization).
 *
 * This is why the below functions exist and some functions in util.rs have this
 * annotation.
 *
 * References:
 * https://discord.com/channels/889577356681945098/889702325231427584/903794898526928907
 * https://nnethercote.github.io/perf-book/inlining.html
 */
#[inline(never)]
pub fn create_ata_for_buy_edition<'a>(
    ata: AccountInfo<'a>,
    buyer: AccountInfo<'a>,
    limited_edition_mint: AccountInfo<'a>,
    ata_program: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    rent: AccountInfo<'a>,
    rent_struct: &Rent,
) -> Result<()> {
    let min_rent_lamports = rent_struct.minimum_balance(Mint::LEN).max(1);
    invoke_signed(
        &system_instruction::create_account(
            &buyer.key(),
            &limited_edition_mint.key(),
            min_rent_lamports,
            Mint::LEN as u64,
            &token_program.key(),
        ),
        &[
            buyer.to_account_info(),
            limited_edition_mint.to_account_info(),
            system_program.to_account_info(),
        ],
        &[],
    )?;

    invoke_signed(
        &initialize_mint(
            &token_program.key(),
            &limited_edition_mint.key(),
            &buyer.key(),
            Some(&buyer.key()),
            0,
        )
        .unwrap(),
        &[
            limited_edition_mint.to_account_info(),
            rent.to_account_info(),
            token_program.to_account_info(),
        ],
        &[],
    )?;

    make_ata(
        ata.to_account_info(),
        buyer.to_account_info(),
        limited_edition_mint.to_account_info(),
        buyer.to_account_info(),
        ata_program.to_account_info(),
        token_program.to_account_info(),
        system_program.to_account_info(),
        rent.to_account_info(),
        &[],
    )?;

    invoke_signed(
        &mint_to(
            &token_program.key(),
            &limited_edition_mint.key(),
            &ata.key(),
            &buyer.key(),
            &[],
            1,
        )
        .unwrap(),
        &[
            limited_edition_mint.to_account_info(),
            ata.to_account_info(),
            buyer.to_account_info(),
            token_program.to_account_info(),
        ],
        &[],
    )?;

    Ok(())
}

#[inline(never)]
pub fn mint_next_edition<'a>(
    token_metadata_program: AccountInfo<'a>,
    limited_edition_metadata: AccountInfo<'a>,
    limited_edition_pda: AccountInfo<'a>,
    master_edition_pda: AccountInfo<'a>,
    limited_edition_mint: AccountInfo<'a>,
    edition_marker_pda: AccountInfo<'a>,
    buyer: AccountInfo<'a>,
    edition_distributor: AccountInfo<'a>,
    master_edition_token_account: AccountInfo<'a>,
    owner: AccountInfo<'a>,
    master_edition_metadata: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    rent: AccountInfo<'a>,
    edition_distributor_master_edition_mint: &Pubkey,
    edition_distributor_bump: u8,
    next_available_edition: u64,
) -> Result<()> {
    let account_infos = [
        token_metadata_program.to_account_info().clone(),
        limited_edition_metadata.to_account_info().clone(),
        limited_edition_pda.to_account_info().clone(),
        master_edition_pda.to_account_info().clone(),
        limited_edition_mint.to_account_info().clone(),
        edition_marker_pda.to_account_info().clone(),
        buyer.to_account_info().clone(),
        buyer.to_account_info().clone(),
        edition_distributor.to_account_info().clone(),
        master_edition_token_account.to_account_info().clone(),
        owner.to_account_info().clone(),
        master_edition_metadata.to_account_info().clone(),
        mint.to_account_info().clone(),
        rent.to_account_info().clone(),
    ];

    let edition_distributor_seeds = [
        EDITION_DISTRIBUTOR.as_bytes(),
        &edition_distributor_master_edition_mint.to_bytes(),
        &[edition_distributor_bump],
    ];

    invoke_signed(
        &mpl_token_metadata::instruction::mint_new_edition_from_master_edition_via_token(
            *token_metadata_program.key,
            *limited_edition_metadata.key,
            *limited_edition_pda.key,
            *master_edition_pda.key,
            *limited_edition_mint.key,
            *buyer.key,
            *buyer.key,
            *edition_distributor.key,
            *master_edition_token_account.key,
            *owner.key,
            *master_edition_metadata.key,
            *mint.key,
            next_available_edition,
        ),
        &account_infos,
        &[&edition_distributor_seeds],
    )?;

    Ok(())
}
