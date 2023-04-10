use anchor_lang::solana_program;

use {
    crate::constants::{FEE_PAYER, PREFIX},
    crate::{
        AuctionHouse, AuctionHouseError, LastBidPrice, PriceFunction, PriceFunctionType,
        TradeStateSaleType,
    },
    anchor_lang::{
        prelude::*,
        solana_program::{
            program::{invoke, invoke_signed},
            program_pack::{IsInitialized, Pack},
            system_instruction,
        },
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{Token, TokenAccount},
    },
    arrayref::array_ref,
    mpl_token_metadata::state::{Metadata, TokenMetadataAccount},
    num_traits::FromPrimitive,
    spl_associated_token_account::get_associated_token_address,
    spl_token::{
        instruction::{initialize_account2, revoke},
        state::Account,
    },
    std::{convert::TryInto, io::Write, slice::Iter, str::FromStr},
};

// 0.01 SOL
const BOT_FEE: u64 = 10u64.pow(7);

pub const AUCTION_HOUSE_MAINNET_PROGRAM_ID: &str = "formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC";
const AUCTION_HOUSE_DEVNET_PROGRAM_ID: &str = "devmBQyHHBPiLcuCqbWWRYxCG33ntAfPD5nXZeLd4eX";
const AUCTION_HOUSE_TESTNET_PROGRAM_ID: &str = "jzmdMPJhm7Txb2RzYPte6Aj1QWqFarmjsJuWjk9m2wv";
const AUCTION_HOUSE_LOCALNET_PROGRAM_ID: &str = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";

const SOL_AUCTION_HOUSE_ACCOUNT_MAINNET: &str = "u5pLTMPar2nvwyPPVKbJ3thqfv7hPADdn3eR8zo1Q2M";
const SOL_AUCTION_HOUSE_ACCOUNT_DEVNET: &str = "DJ117NHZaXzpKQ5VwHzQBGzJYKwRT6vaxWd2q39gkXxN";
const SOL_AUCTION_HOUSE_ACCOUNT_TESTNET: &str = "BnYmzPQitxZ3Q736LrC25bcvBN8hPLth1q3z4JJxyY7s";
const SOL_AUCTION_HOUSE_ACCOUNT_LOCALNET: &str = "8nEg1EYQ24mvy8fkKbS7kje6rsfBKY1cZ8CyWBoL57QA";

const USDC_AUCTION_HOUSE_ACCOUNT_MAINNET: &str = "3TPU8SuKEghJgE1EBcbZgVfQKAFoAPkc1NfHDZYJyF77";

const FOXY_AUCTION_HOUSE_ACCOUNT_MAINNET: &str = "4QZDroaPxHMJmR3ByWHz1QeLAkSRC68gQ2u4G3wrtd2T";

const PARTICLES_AUCTION_HOUSE_ACCOUNT_MAINNET: &str =
    "HtsczT1hN9SdPPiLCt8k8dRUhPLhqc3tcSMu4n6uYFw2";

const SKELETON_CREW_AUCTION_HOUSE_ACCOUNT_MAINNET: &str =
    "GVoQ2aXF4beQwc2AmPJyiSKcaHbyphn1GsPD43yyxPtx";

const BONK_AUCTION_HOUSE_ACCOUNT_MAINNET: &str = "CfyQQDi7hhAgnQVgXyMTTTBV2nEt8TbPkgLMbM6G5GEV";

const ASH_AUCTION_HOUSE_ACCOUNT_MAINNET: &str = "FAEXa6G1yZJhzon572CXKac6oM7vEFDKtd4UVnwoV8XA";

const LAST_BID_PRICE: &str = "last_bid_price";

pub const ZERO_PUBKEY: Pubkey = Pubkey::new_from_array([0; 32]);

pub fn assert_is_ata(ata: &AccountInfo, wallet: &Pubkey, mint: &Pubkey) -> Result<Account> {
    assert_owned_by(ata, &spl_token::id())?;
    let ata_account: Account = assert_initialized(ata)?;
    assert_keys_equal(ata_account.owner, *wallet)?;
    assert_keys_equal(get_associated_token_address(wallet, mint), *ata.key)?;
    Ok(ata_account)
}

#[inline(never)]
pub fn make_ata<'a>(
    ata: AccountInfo<'a>,
    wallet: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    fee_payer: AccountInfo<'a>,
    ata_program: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    rent: AccountInfo<'a>,
    fee_payer_seeds: &[&[u8]],
) -> Result<()> {
    let as_arr = [fee_payer_seeds];
    let seeds: &[&[&[u8]]] = if fee_payer_seeds.is_empty() {
        &[]
    } else {
        &as_arr
    };

    invoke_signed(
        &spl_associated_token_account::instruction::create_associated_token_account(
            fee_payer.key,
            wallet.key,
            mint.key,
            token_program.key,
        ),
        &[
            ata,
            wallet,
            mint,
            fee_payer,
            ata_program,
            system_program,
            rent,
            token_program,
        ],
        seeds,
    )?;

    Ok(())
}

pub fn assert_metadata_valid<'a>(
    metadata: &UncheckedAccount,
    token_account: &anchor_lang::prelude::Account<'a, TokenAccount>,
) -> Result<()> {
    assert_derivation(
        &mpl_token_metadata::id(),
        &metadata.to_account_info(),
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            token_account.mint.as_ref(),
        ],
    )?;

    if metadata.data_is_empty() {
        return Err(AuctionHouseError::MetadataDoesntExist.into());
    }
    Ok(())
}

pub fn get_fee_payer<'a, 'b>(
    authority: &UncheckedAccount,
    auction_house: &anchor_lang::prelude::Account<AuctionHouse>,
    wallet: AccountInfo<'a>,
    auction_house_fee_account: AccountInfo<'a>,
    auction_house_seeds: &'b [&'b [u8]],
) -> Result<(AccountInfo<'a>, &'b [&'b [u8]])> {
    let mut seeds: &[&[u8]] = &[];
    let fee_payer: AccountInfo;
    if authority.to_account_info().is_signer || auction_house.pay_all_fees {
        seeds = auction_house_seeds;
        fee_payer = auction_house_fee_account;
    } else if wallet.is_signer {
        if auction_house.requires_sign_off {
            return Err(AuctionHouseError::CannotTakeThisActionWithoutAuctionHouseSignOff.into());
        }
        fee_payer = wallet
    } else {
        return Err(AuctionHouseError::NoPayerPresent.into());
    };

    Ok((fee_payer, &seeds))
}

pub fn assert_keys_equal(key1: Pubkey, key2: Pubkey) -> Result<()> {
    if key1 != key2 {
        msg!("PublicKeyMismatch, expected {} = {}", key1, key2);
        Err(AuctionHouseError::PublicKeyMismatch.into())
    } else {
        Ok(())
    }
}

pub fn assert_token_account_owner(key1: Pubkey, key2: Pubkey) -> Result<()> {
    if key1 != key2 {
        Err(AuctionHouseError::IncorrectOwner.into())
    } else {
        Ok(())
    }
}

pub fn assert_initialized<T: Pack + IsInitialized>(account_info: &AccountInfo) -> Result<T> {
    let account: T = T::unpack_unchecked(&account_info.data.borrow())?;
    if !account.is_initialized() {
        Err(AuctionHouseError::UninitializedAccount.into())
    } else {
        Ok(account)
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> Result<()> {
    if account.owner != owner {
        Err(AuctionHouseError::IncorrectOwner.into())
    } else {
        Ok(())
    }
}

pub fn assert_valid_auction_house(program_id: &Pubkey, auction_house: &Pubkey) -> Result<()> {
    if program_id.to_string() != AUCTION_HOUSE_MAINNET_PROGRAM_ID {
        // We only care about performing this check for the mainnet program
        return Ok(());
    }

    if ![
        SOL_AUCTION_HOUSE_ACCOUNT_MAINNET,
        USDC_AUCTION_HOUSE_ACCOUNT_MAINNET,
        FOXY_AUCTION_HOUSE_ACCOUNT_MAINNET,
        PARTICLES_AUCTION_HOUSE_ACCOUNT_MAINNET,
        SKELETON_CREW_AUCTION_HOUSE_ACCOUNT_MAINNET,
        BONK_AUCTION_HOUSE_ACCOUNT_MAINNET,
        ASH_AUCTION_HOUSE_ACCOUNT_MAINNET,
    ]
    .iter()
    .any(|&address| address == auction_house.to_string())
    {
        return Err(AuctionHouseError::InvalidAuctionHouse.into());
    }

    Ok(())
}

fn assert_last_bid_price_derivation(
    program_id: &Pubkey,
    last_bid_price: &AccountInfo,
    mint: &Pubkey,
    auction_house_account_key_as_string: &str,
) -> Result<u8> {
    let auction_house_account_key = Pubkey::from_str(auction_house_account_key_as_string).unwrap();
    return assert_derivation(
        program_id,
        last_bid_price,
        &[
            LAST_BID_PRICE.as_bytes(),
            auction_house_account_key.as_ref(),
            mint.as_ref(),
        ],
    );
}

pub fn assert_valid_last_bid_price(
    last_bid_price: &AccountInfo,
    program_id: &Pubkey,
    mint: &Pubkey,
) -> Result<()> {
    let auction_house_account_key = match &*program_id.to_string() {
        AUCTION_HOUSE_MAINNET_PROGRAM_ID => SOL_AUCTION_HOUSE_ACCOUNT_MAINNET,
        AUCTION_HOUSE_DEVNET_PROGRAM_ID => SOL_AUCTION_HOUSE_ACCOUNT_DEVNET,
        AUCTION_HOUSE_TESTNET_PROGRAM_ID => SOL_AUCTION_HOUSE_ACCOUNT_TESTNET,
        AUCTION_HOUSE_LOCALNET_PROGRAM_ID => SOL_AUCTION_HOUSE_ACCOUNT_LOCALNET,
        _ => panic!("Invalid program ID"),
    };

    assert_last_bid_price_derivation(program_id, last_bid_price, mint, &auction_house_account_key)?;

    return Ok(());
}

pub fn assert_valid_anti_bot_authority(
    program_id: &Pubkey,
    anti_bot_authority: &Pubkey,
) -> Result<()> {
    if program_id.to_string() == AUCTION_HOUSE_MAINNET_PROGRAM_ID {
        if anti_bot_authority.to_string() != "antiScHGm8NAqfpdFNYbv3c9ntY6xksvvTN3B9cDf5Y" {
            return Err(AuctionHouseError::InvalidAntiBotAuthority.into());
        }

        return Ok(());
    }

    // This address is used for devnet and testnet:
    if anti_bot_authority.to_string() != "antiDV8bRvF4XTeRqmyHV1jpHD4Lvz7gKBKBBRQb8ir" {
        return Err(AuctionHouseError::InvalidAntiBotAuthority.into());
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn pay_auction_house_fees<'a>(
    auction_house: &anchor_lang::prelude::Account<'a, AuctionHouse>,
    auction_house_treasury: &AccountInfo<'a>,
    escrow_payment_account: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
    size: u64,
    is_native: bool,
    has_been_sold: bool,
) -> Result<u64> {
    let fees = if has_been_sold {
        auction_house.seller_fee_basis_points_secondary
    } else {
        auction_house.seller_fee_basis_points
    };
    let total_fee = (fees as u128)
        .checked_mul(size as u128)
        .ok_or(AuctionHouseError::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(AuctionHouseError::NumericalOverflow)? as u64;
    if !is_native {
        invoke_signed(
            &spl_token::instruction::transfer(
                token_program.key,
                &escrow_payment_account.key,
                &auction_house_treasury.key,
                &auction_house.key(),
                &[],
                total_fee,
            )?,
            &[
                escrow_payment_account.clone(),
                auction_house_treasury.clone(),
                token_program.clone(),
                auction_house.to_account_info(),
            ],
            &[signer_seeds],
        )?;
    } else {
        invoke_signed(
            &system_instruction::transfer(
                &escrow_payment_account.key,
                auction_house_treasury.key,
                total_fee,
            ),
            &[
                escrow_payment_account.clone(),
                auction_house_treasury.clone(),
                system_program.clone(),
            ],
            &[signer_seeds],
        )?;
    }
    Ok(total_fee)
}

pub fn create_program_token_account_if_not_present<'a>(
    payment_account: &UncheckedAccount<'a>,
    system_program: &Program<'a, System>,
    fee_payer: &AccountInfo<'a>,
    token_program: &Program<'a, Token>,
    treasury_mint: &AccountInfo<'a>,
    owner: &AccountInfo<'a>,
    rent: &Sysvar<'a, Rent>,
    signer_seeds: &[&[u8]],
    fee_seeds: &[&[u8]],
    is_native: bool,
) -> Result<()> {
    if !is_native && payment_account.data_is_empty() {
        create_or_allocate_account_raw(
            *token_program.key,
            &payment_account.to_account_info(),
            &rent.to_account_info(),
            &system_program,
            &fee_payer,
            spl_token::state::Account::LEN,
            fee_seeds,
            signer_seeds,
        )?;
        msg!("This.");
        invoke_signed(
            &initialize_account2(
                &token_program.key,
                &payment_account.key(),
                &treasury_mint.key(),
                &owner.key(),
            )
            .unwrap(),
            &[
                token_program.to_account_info(),
                treasury_mint.clone(),
                payment_account.to_account_info(),
                rent.to_account_info(),
                owner.clone(),
            ],
            &[&signer_seeds],
        )?;
        msg!("Passes");
    }
    Ok(())
}

pub fn revoke_helper<'a>(
    token_program: &AccountInfo<'a>,
    token_account: &AccountInfo<'a>,
    wallet: &AccountInfo<'a>,
    trade_state: &AccountInfo<'a>,
    fee_payer: &AccountInfo<'a>,
) -> Result<()> {
    // Jank stuff
    // https://discord.com/channels/889577356681945098/889577399308656662/909082157471907901
    let mut instruction = revoke(
        &token_program.key(),
        &token_account.key(),
        &wallet.key(),
        &[],
    )
    .unwrap();

    instruction
        .accounts
        .push(anchor_lang::solana_program::instruction::AccountMeta {
            pubkey: trade_state.key(),
            is_signer: false,
            is_writable: false,
        });

    instruction
        .accounts
        .push(anchor_lang::solana_program::instruction::AccountMeta {
            pubkey: fee_payer.key(),
            is_signer: false,
            is_writable: false,
        });

    invoke(
        &instruction,
        &[
            token_program.to_account_info(),
            token_account.to_account_info(),
            wallet.to_account_info(),
            trade_state.to_account_info(),
            fee_payer.to_account_info(),
        ],
    )?;

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn pay_creator_fees<'a>(
    remaining_accounts: &mut Iter<AccountInfo<'a>>,
    metadata_info: &AccountInfo<'a>,
    escrow_payment_account: &AccountInfo<'a>,
    payment_account_owner: &AccountInfo<'a>,
    fee_payer: &AccountInfo<'a>,
    treasury_mint: &AccountInfo<'a>,
    ata_program: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    rent: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
    fee_payer_seeds: &[&[u8]],
    size: u64,
    is_native: bool,
) -> Result<u64> {
    let metadata = Metadata::from_account_info(metadata_info)?;
    let fees = metadata.data.seller_fee_basis_points;
    let total_fee = (fees as u128)
        .checked_mul(size as u128)
        .ok_or(AuctionHouseError::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(AuctionHouseError::NumericalOverflow)? as u64;
    let mut remaining_fee = total_fee;
    let remaining_size = size
        .checked_sub(total_fee)
        .ok_or(AuctionHouseError::NumericalOverflow)?;
    match metadata.data.creators {
        Some(creators) => {
            for creator in creators {
                let pct = creator.share as u128;
                let creator_fee =
                    pct.checked_mul(total_fee as u128)
                        .ok_or(AuctionHouseError::NumericalOverflow)?
                        .checked_div(100)
                        .ok_or(AuctionHouseError::NumericalOverflow)? as u64;
                remaining_fee = remaining_fee
                    .checked_sub(creator_fee)
                    .ok_or(AuctionHouseError::NumericalOverflow)?;
                let current_creator_info = next_account_info(remaining_accounts)?;
                assert_keys_equal(creator.address, *current_creator_info.key)?;
                if !is_native {
                    let current_creator_token_account_info = next_account_info(remaining_accounts)?;
                    if current_creator_token_account_info.data_is_empty() {
                        make_ata(
                            current_creator_token_account_info.to_account_info(),
                            current_creator_info.to_account_info(),
                            treasury_mint.to_account_info(),
                            fee_payer.to_account_info(),
                            ata_program.to_account_info(),
                            token_program.to_account_info(),
                            system_program.to_account_info(),
                            rent.to_account_info(),
                            fee_payer_seeds,
                        )?;
                    }
                    assert_is_ata(
                        current_creator_token_account_info,
                        current_creator_info.key,
                        &treasury_mint.key(),
                    )?;
                    if creator_fee > 0 {
                        invoke_signed(
                            &spl_token::instruction::transfer(
                                token_program.key,
                                &escrow_payment_account.key,
                                current_creator_token_account_info.key,
                                payment_account_owner.key,
                                &[],
                                creator_fee,
                            )?,
                            &[
                                escrow_payment_account.clone(),
                                current_creator_token_account_info.clone(),
                                token_program.clone(),
                                payment_account_owner.clone(),
                            ],
                            &[signer_seeds],
                        )?;
                    }
                } else if creator_fee > 0 {
                    invoke_signed(
                        &system_instruction::transfer(
                            &escrow_payment_account.key,
                            current_creator_info.key,
                            creator_fee,
                        ),
                        &[
                            escrow_payment_account.clone(),
                            current_creator_info.clone(),
                            system_program.clone(),
                        ],
                        &[signer_seeds],
                    )?;
                }
            }
        }
        None => {
            msg!("No creators found in metadata");
        }
    }
    // Any dust is returned to the party posting the NFT
    Ok(remaining_size
        .checked_add(remaining_fee)
        .ok_or(AuctionHouseError::NumericalOverflow)?)
}

/// Cheap method to just grab mint Pubkey from token account, instead of deserializing entire thing
pub fn get_mint_from_token_account(token_account_info: &AccountInfo) -> Result<Pubkey> {
    // TokenAccount layout:   mint(32), owner(32), ...
    let data = token_account_info.try_borrow_data()?;
    let mint_data = array_ref![data, 0, 32];
    Ok(Pubkey::new_from_array(*mint_data))
}

/// Cheap method to just grab owner Pubkey from token account, instead of deserializing entire thing
pub fn get_owner_from_token_account(token_account_info: &AccountInfo) -> Result<Pubkey> {
    // TokenAccount layout:   mint(32), owner(32), ...
    let data = token_account_info.try_borrow_data()?;
    let owner_data = array_ref![data, 32, 32];
    Ok(Pubkey::new_from_array(*owner_data))
}

/// Cheap method to just grab delegate Pubkey from token account, instead of deserializing entire thing
pub fn get_delegate_from_token_account(token_account_info: &AccountInfo) -> Result<Option<Pubkey>> {
    // TokenAccount layout:   mint(32), owner(32), ...
    let data = token_account_info.try_borrow_data()?;
    let key_data = array_ref![data, 76, 32];
    let coption_data = u32::from_le_bytes(*array_ref![data, 72, 4]);
    if coption_data == 0 {
        Ok(None)
    } else {
        Ok(Some(Pubkey::new_from_array(*key_data)))
    }
}

/// Create account almost from scratch, lifted from
/// https://github.com/solana-labs/solana-program-library/blob/7d4873c61721aca25464d42cc5ef651a7923ca79/associated-token-account/program/src/processor.rs#L51-L98
#[inline(always)]
pub fn create_or_allocate_account_raw<'a>(
    program_id: Pubkey,
    new_account_info: &AccountInfo<'a>,
    rent_sysvar_info: &AccountInfo<'a>,
    system_program_info: &AccountInfo<'a>,
    payer_info: &AccountInfo<'a>,
    size: usize,
    signer_seeds: &[&[u8]],
    new_acct_seeds: &[&[u8]],
) -> Result<()> {
    let rent = &Rent::from_account_info(rent_sysvar_info)?;
    let required_lamports = rent
        .minimum_balance(size)
        .max(1)
        .saturating_sub(new_account_info.lamports());

    if required_lamports > 0 {
        msg!("Transfer {} lamports to the new account", required_lamports);
        let seeds: &[&[&[u8]]];
        let as_arr = [signer_seeds];

        if signer_seeds.len() > 0 {
            seeds = &as_arr;
        } else {
            seeds = &[];
        }
        invoke_signed(
            &system_instruction::transfer(&payer_info.key, new_account_info.key, required_lamports),
            &[
                payer_info.clone(),
                new_account_info.clone(),
                system_program_info.clone(),
            ],
            seeds,
        )?;
    }

    let accounts = &[new_account_info.clone(), system_program_info.clone()];

    msg!("Allocate space for the account {}", new_account_info.key);
    invoke_signed(
        &system_instruction::allocate(new_account_info.key, size.try_into().unwrap()),
        accounts,
        &[&new_acct_seeds],
    )?;

    msg!("Assign the account to the owning program");
    invoke_signed(
        &system_instruction::assign(new_account_info.key, &program_id),
        accounts,
        &[&new_acct_seeds],
    )?;
    msg!("Completed assignation!");

    Ok(())
}

pub fn assert_derivation(program_id: &Pubkey, account: &AccountInfo, path: &[&[u8]]) -> Result<u8> {
    let (key, bump) = Pubkey::find_program_address(&path, program_id);
    if key != *account.key {
        return Err(AuctionHouseError::DerivedKeyInvalid.into());
    }
    Ok(bump)
}

// Same as assert_derivation, but uses Pubkey::create_program_address instead of Pubkey::find_program_address
// for better performance.
pub fn assert_pda_derivation(
    program_id: &Pubkey,
    account: &AccountInfo,
    path: &[&[u8]],
) -> Result<Pubkey> {
    let result = Pubkey::create_program_address(&path, program_id);
    match result {
        Ok(pda) => {
            if pda != *account.key {
                return Err(AuctionHouseError::DerivedKeyInvalid.into());
            }

            Ok(pda)
        }
        Err(_e) => Err(AuctionHouseError::DerivedKeyInvalid.into()),
    }
}

pub fn get_min_price_difference_for_decimals(decimals: u8) -> u64 {
    return 10u64.pow((decimals - 1) as u32);
}

pub fn get_min_price_diff_in_lamports(
    price: u64,
    tick_size_constant: u64,
    decimals: u8,
) -> Result<u64> {
    // If tick_size_constant_in_lamports is non-zero, use that.
    // Otherwise, fall back to a default of 10%.
    if tick_size_constant != 0 {
        return Ok(tick_size_constant);
    }

    if decimals == 0 {
        // Need to special case this, otherwise calling get_min_price_difference_for_decimals will blow up
        // (because we will cast -1 to a u32)
        return price
            .checked_div(10)
            .ok_or(AuctionHouseError::NumericalOverflow.into());
    }

    let min_price_increment = get_min_price_difference_for_decimals(decimals);
    let unit_price = 10u64.pow(decimals as u32);

    if price <= unit_price {
        return Ok(min_price_increment);
    }

    // First, calculate 10%
    let ten_percent = price
        .checked_div(10)
        .ok_or(AuctionHouseError::NumericalOverflow)?;

    // Round down to nearest 0.1
    let rounded = ten_percent
        .checked_div(min_price_increment)
        .ok_or(AuctionHouseError::NumericalOverflow)?;

    // Convert back to full decimals
    return rounded
        .checked_mul(min_price_increment)
        .ok_or(AuctionHouseError::NumericalOverflow.into());
}

/**
 * Helper fn for generic withdrawals.
 */
pub fn withdraw_helper<'info>(
    wallet: &UncheckedAccount<'info>,
    receipt_account: &UncheckedAccount<'info>,
    escrow_payment_account: &UncheckedAccount<'info>,
    authority: &UncheckedAccount<'info>,
    auction_house: &anchor_lang::prelude::Account<'info, AuctionHouse>,
    auction_house_fee_account: &UncheckedAccount<'info>,
    treasury_mint: &AccountInfo<'info>,
    token_mint: &UncheckedAccount<'info>,
    system_program: &Program<'info, System>,
    token_program: &Program<'info, Token>,
    ata_program: &Program<'info, AssociatedToken>,
    rent: &Sysvar<'info, Rent>,
    escrow_payment_bump: u8,
    amount: u64,
    enforce_signer: bool,
) -> Result<()> {
    let auction_house_key = auction_house.key();
    let seeds = [
        PREFIX.as_bytes(),
        auction_house_key.as_ref(),
        FEE_PAYER.as_bytes(),
        &[auction_house.fee_payer_bump],
    ];

    let ah_seeds = [
        PREFIX.as_bytes(),
        auction_house.creator.as_ref(),
        auction_house.treasury_mint.as_ref(),
        &[auction_house.bump],
    ];

    let auction_house_key = auction_house.key();
    let wallet_key = wallet.key();
    let token_mint_key = token_mint.key();

    if enforce_signer
        && !wallet.to_account_info().is_signer
        && !authority.to_account_info().is_signer
    {
        return Err(AuctionHouseError::NoValidSignerPresent.into());
    }

    let escrow_signer_seeds = [
        PREFIX.as_bytes(),
        auction_house_key.as_ref(),
        wallet_key.as_ref(),
        token_mint_key.as_ref(),
        &[escrow_payment_bump],
    ];

    let (fee_payer, fee_seeds) = get_fee_payer(
        authority,
        auction_house,
        wallet.to_account_info(),
        auction_house_fee_account.to_account_info(),
        &seeds,
    )?;

    let is_native = treasury_mint.key() == spl_token::native_mint::id();

    if !is_native {
        if receipt_account.data_is_empty() {
            make_ata(
                receipt_account.to_account_info(),
                wallet.to_account_info(),
                treasury_mint.to_account_info(),
                fee_payer.to_account_info(),
                ata_program.to_account_info(),
                token_program.to_account_info(),
                system_program.to_account_info(),
                rent.to_account_info(),
                &fee_seeds,
            )?;
        }

        let rec_acct = assert_is_ata(
            &receipt_account.to_account_info(),
            &wallet.key(),
            &treasury_mint.key(),
        )?;

        if rec_acct.delegate.is_some() {
            // NOTE: this used to throw an error in the original
            // auction house code for supposed "rug" protection
            // but we think it's not necessary so we are logging
            // a warning instead
            msg!("WARNING: buyer ATA has delegate!")
        }

        assert_is_ata(receipt_account, &wallet.key(), &treasury_mint.key())?;
        invoke_signed(
            &spl_token::instruction::transfer(
                token_program.key,
                &escrow_payment_account.key(),
                &receipt_account.key(),
                &auction_house.key(),
                &[],
                amount,
            )?,
            &[
                escrow_payment_account.to_account_info(),
                receipt_account.to_account_info(),
                token_program.to_account_info(),
                auction_house.to_account_info(),
            ],
            &[&ah_seeds],
        )?;
    } else {
        assert_keys_equal(receipt_account.key(), wallet.key())?;
        invoke_signed(
            &system_instruction::transfer(
                &escrow_payment_account.key(),
                &receipt_account.key(),
                amount,
            ),
            &[
                escrow_payment_account.to_account_info(),
                receipt_account.to_account_info(),
                system_program.to_account_info(),
            ],
            &[&escrow_signer_seeds],
        )?;
    }

    Ok(())
}

/**
 * Returns has_been_sold by checking the metadata.primary_sale_happened and
 * falling back to last_bid_price.has_been_sold if metadata.primary_sale_happened
 * is false.
 *
 * We do this since metadata.primary_sale_happened can only be set by the update_authority
 * and thus in scenarios where the update_authority of the metadata is not the one executing
 * the sale (e.g., instant sales), the metadata will not be updated to reflect the primary sale
 * having happened.
 */
pub fn get_has_been_sold(metadata: &Metadata, last_bid_price: Option<&LastBidPrice>) -> bool {
    return match last_bid_price {
        None => metadata.primary_sale_happened,
        Some(last_bid_price) => metadata.primary_sale_happened || last_bid_price.has_been_sold == 1,
    };
}

/**
 * Returns true if the primary sale should be split between the creators in the metadata creators array.
 *
 * The primary sale should only be split if all these conditions are satisfied:
 * 1) creators.length > 1
 * 2) The seller is included in the list of creators
 * 3) has_been_sold is false
 */
pub fn should_split_primary_sale(
    metadata: &Metadata,
    seller: &Pubkey,
    has_been_sold: bool,
) -> bool {
    match &metadata.data.creators {
        Some(creators) => {
            return creators.len() > 1
                && !has_been_sold
                // Seller must be one of the creators
                && creators.iter().any(|creator| creator.address.eq(seller));
        }
        None => {
            return false;
        }
    }
}

/**
 * Basically the same as pay_creator_fees, but splits the primary sale between creators.
 *
 * A few important things to note:
 * - remaining_accounts must be ordered the same as the on-chain creators
 * - this only supports native (SOL) payments
 */
#[allow(clippy::too_many_arguments)]
pub fn split_primary_sale_between_creators_native<'a>(
    remaining_accounts: &mut Iter<AccountInfo<'a>>,
    metadata_info: &AccountInfo<'a>,
    payer_account: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
    total_amount: u64,
) -> Result<()> {
    let metadata = Metadata::from_account_info(metadata_info)?;
    let mut remaining_amount = total_amount;
    match metadata.data.creators {
        Some(creators) => {
            for (index, creator) in creators.iter().enumerate() {
                let pct = creator.share as u128;
                let creator_amount = if index != creators.len() - 1 {
                    pct.checked_mul(total_amount as u128)
                        .ok_or(AuctionHouseError::NumericalOverflow)?
                        .checked_div(100)
                        .ok_or(AuctionHouseError::NumericalOverflow)? as u64
                } else {
                    // Leftover amount due to imprecision given to last creator
                    remaining_amount
                };
                remaining_amount = remaining_amount
                    .checked_sub(creator_amount)
                    .ok_or(AuctionHouseError::NumericalOverflow)?;
                let current_creator_info = next_account_info(remaining_accounts)?;
                assert_keys_equal(creator.address, *current_creator_info.key)?;
                invoke_signed(
                    &system_instruction::transfer(
                        &payer_account.key,
                        current_creator_info.key,
                        creator_amount,
                    ),
                    &[
                        payer_account.clone(),
                        current_creator_info.clone(),
                        system_program.clone(),
                    ],
                    &[signer_seeds],
                )?;
            }
        }
        None => {
            msg!("No creators found in metadata");
        }
    }

    Ok(())
}

/**
 * Basically the same as pay_creator_fees, but splits the primary sale between creators.
 *
 * A few important things to note:
 * - remaining_accounts must be ordered the same as the on-chain creators
 * - this only supports non-native (SPL token) payments
 */
#[allow(clippy::too_many_arguments)]
pub fn split_primary_sale_between_creators_non_native<'a>(
    remaining_accounts: &mut Iter<AccountInfo<'a>>,
    metadata_info: &AccountInfo<'a>,
    payer_account: &AccountInfo<'a>,
    payment_account_owner: &AccountInfo<'a>,
    fee_payer: &AccountInfo<'a>,
    treasury_mint: &AccountInfo<'a>,
    ata_program: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    rent: &AccountInfo<'a>,
    signer_seeds: &[&[u8]],
    fee_payer_seeds: &[&[u8]],
    total_amount: u64,
) -> Result<()> {
    let metadata = Metadata::from_account_info(metadata_info)?;
    let mut remaining_amount = total_amount;
    match metadata.data.creators {
        Some(creators) => {
            for (index, creator) in creators.iter().enumerate() {
                let pct = creator.share as u128;
                let creator_amount = if index != creators.len() - 1 {
                    pct.checked_mul(total_amount as u128)
                        .ok_or(AuctionHouseError::NumericalOverflow)?
                        .checked_div(100)
                        .ok_or(AuctionHouseError::NumericalOverflow)? as u64
                } else {
                    // Leftover amount due to imprecision given to last creator
                    remaining_amount
                };
                remaining_amount = remaining_amount
                    .checked_sub(creator_amount)
                    .ok_or(AuctionHouseError::NumericalOverflow)?;
                let current_creator_info = next_account_info(remaining_accounts)?;
                assert_keys_equal(creator.address, *current_creator_info.key)?;
                let current_creator_token_account_info = next_account_info(remaining_accounts)?;
                if current_creator_token_account_info.data_is_empty() {
                    make_ata(
                        current_creator_token_account_info.to_account_info(),
                        current_creator_info.to_account_info(),
                        treasury_mint.to_account_info(),
                        fee_payer.to_account_info(),
                        ata_program.to_account_info(),
                        token_program.to_account_info(),
                        system_program.to_account_info(),
                        rent.to_account_info(),
                        fee_payer_seeds,
                    )?;
                }
                assert_is_ata(
                    current_creator_token_account_info,
                    current_creator_info.key,
                    &treasury_mint.key(),
                )?;
                if creator_amount > 0 {
                    invoke_signed(
                        &spl_token::instruction::transfer(
                            token_program.key,
                            &payer_account.key,
                            current_creator_token_account_info.key,
                            payment_account_owner.key,
                            &[],
                            creator_amount,
                        )?,
                        &[
                            payer_account.clone(),
                            current_creator_token_account_info.clone(),
                            token_program.clone(),
                            payment_account_owner.clone(),
                        ],
                        &[signer_seeds],
                    )?;
                }
            }
        }
        None => {
            msg!("No creators found in metadata");
        }
    }

    Ok(())
}

/**
 * NOTE: edition should be 1-indexed
 *
 * Here's a breakdown of what params exist for each price function type.
 *
 * ===== PriceFunctionType::Constant =====
 * This one is easy, there are no params
 *
 * ===== PriceFunctionType::Linear =====
 * - param0: the slope, in lamports
 * - param1 (optional): max price, in lamports
 *
 * ===== PriceFunctionType::Minimum =====
 * This one is easy, there are no params
 */
pub fn get_price_for_edition(
    edition: u64,
    price_function: &PriceFunction,
    is_allowlist_sale: bool,
    allowlist_sale_price: Option<u64>,
    allowlist_number_sold: u64,
) -> Result<u64> {
    if edition == 0 {
        return Err(AuctionHouseError::InvalidEdition.into());
    }

    if is_allowlist_sale && allowlist_sale_price.is_some() {
        return Ok(allowlist_sale_price.unwrap());
    }

    match price_function.price_function_type {
        PriceFunctionType::Constant => {
            return Ok(price_function.starting_price_lamports);
        }
        PriceFunctionType::Linear => {
            if price_function.params.len() == 0 {
                return Err(AuctionHouseError::InvalidPriceParams.into());
            }
            let slope_in_lamports = price_function.params[0];
            let allowlist_edition_number_adjustment = if allowlist_sale_price.is_some() {
                allowlist_number_sold
            } else {
                0
            };
            let edition_number = edition - allowlist_edition_number_adjustment;
            let to_add = slope_in_lamports * (edition_number - 1) as f64;
            let price = price_function
                .starting_price_lamports
                .checked_add(to_add as u64)
                .ok_or(AuctionHouseError::NumericalOverflow)?;
            let max_price_in_lamports = if price_function.params.len() == 2 {
                price_function.params[1] as u64
            } else {
                u64::MAX
            };
            return Ok(std::cmp::min(price, max_price_in_lamports));
        }
        PriceFunctionType::Minimum => {
            return Ok(price_function.starting_price_lamports);
        }
    }
}

pub fn get_trade_state_sale_type(trade_state: &AccountInfo) -> TradeStateSaleType {
    if trade_state.data_len() > 1 {
        let sale_type = trade_state.data.borrow()[1];
        return FromPrimitive::from_u8(sale_type).unwrap_or(TradeStateSaleType::Auction);
    } else {
        // Default to this
        return TradeStateSaleType::Auction;
    }
}

/**
 * For now, we allow end_time = None
 *
 * We may want to revisit this in the future. But product-wise, it seems
 * like we may want to have an open edition that never ends.
 */
pub fn assert_valid_edition_sale_times(
    allowlist_sale_start_time: Option<i64>,
    public_sale_start_time: i64,
    sale_end_time: Option<i64>,
    unix_timestamp: i64,
) -> Result<()> {
    // Allowlist sale is enabled
    if let Some(allowlist_sale_start_time_val) = allowlist_sale_start_time {
        // Note: a 0 public_sale_start_time represents an allowlist sale with
        // no public sale.
        if public_sale_start_time != 0 && allowlist_sale_start_time_val >= public_sale_start_time {
            return Err(AuctionHouseError::AllowlistSaleMustBeBeforePublicSale.into());
        }
    }

    // Because public_sale_start_time of 0 signifies an allowlist sale with NO
    // public sale, it can only be 0 if an allowlist_sale_start_time is provided.
    if public_sale_start_time == 0 && allowlist_sale_start_time.is_none() {
        return Err(AuctionHouseError::PublicSaleStartTimeCannotBeZero.into());
    }

    if let Some(sale_end_time_val) = sale_end_time {
        // Validate sale_end_time by itself
        if unix_timestamp >= sale_end_time_val {
            return Err(AuctionHouseError::EndTimeMustBeInFuture.into());
        }

        // Validate both start_time and sale_end_time
        if public_sale_start_time >= sale_end_time_val {
            return Err(AuctionHouseError::EndTimeMustComeAfterStartTime.into());
        }

        // Validate allowlist sale time is not after sale_end_time
        if let Some(allowlist_sale_start_time_val) = allowlist_sale_start_time {
            if allowlist_sale_start_time_val >= sale_end_time_val {
                return Err(AuctionHouseError::AllowlistSaleCannotBeAfterEndTime.into());
            }
        }
    }

    return Ok(());
}

pub fn assert_valid_times_for_buy_edition(
    allowlist_sale_start_time: Option<i64>,
    public_sale_start_time: i64,
    sale_end_time: Option<i64>,
    unix_timestamp: i64,
) -> Result<()> {
    if let Some(allowlist_sale_start_time) = allowlist_sale_start_time {
        if unix_timestamp < allowlist_sale_start_time {
            return Err(AuctionHouseError::BuyEditionTooEarly.into());
        }

        if is_during_allowlist_sale(
            Some(allowlist_sale_start_time),
            public_sale_start_time,
            unix_timestamp,
        ) {
            return Ok(());
        }
    }

    if unix_timestamp < public_sale_start_time {
        return Err(AuctionHouseError::BuyEditionTooEarly.into());
    }

    if let Some(end_time_val) = sale_end_time {
        if unix_timestamp > end_time_val {
            return Err(AuctionHouseError::BuyEditionTooLate.into());
        }
    }

    return Ok(());
}

pub fn assert_valid_treasury_mint_for_buy_edition(
    edition_distributor_treasury_mint: Pubkey,
    treasury_mint: Pubkey,
) -> Result<()> {
    if edition_distributor_treasury_mint == ZERO_PUBKEY {
        // For legacy edition distributors, only SOL was supported so we check
        // that the provided treasury mint is the SOL mint
        if treasury_mint != spl_token::native_mint::id() {
            return Err(AuctionHouseError::InvalidTreasuryMintForBuyEdition.into());
        }

        return Ok(());
    }

    if treasury_mint != edition_distributor_treasury_mint {
        return Err(AuctionHouseError::InvalidTreasuryMintForBuyEdition.into());
    }

    return Ok(());
}

pub fn is_during_allowlist_sale(
    allowlist_sale_start_time: Option<i64>,
    public_sale_start_time: i64,
    unix_timestamp: i64,
) -> bool {
    if allowlist_sale_start_time.is_none() {
        return false;
    }

    let allowlist_sale_start_time = allowlist_sale_start_time.unwrap();
    if allowlist_sale_start_time > unix_timestamp {
        return false;
    }

    if unix_timestamp >= public_sale_start_time && public_sale_start_time != 0 {
        return false;
    }

    true
}

pub fn punish_bots<'a>(
    error: Error,
    suspect_bot_account: AccountInfo<'a>,
    payment_account: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
) -> Result<()> {
    let bot_tax_collected_error: Result<()> = Err(AuctionHouseError::BotTaxCollected.into());
    msg!(
        "{}, {}, AuctionHouse botting is taxed at {:?} lamports",
        bot_tax_collected_error.unwrap_err().to_string(),
        error.to_string(),
        BOT_FEE
    );

    let final_fee = BOT_FEE.min(suspect_bot_account.lamports());
    invoke(
        &system_instruction::transfer(suspect_bot_account.key, payment_account.key, final_fee),
        &[suspect_bot_account, payment_account, system_program],
    )?;
    Ok(())
}

pub fn write_anchor_account_discriminator<'a>(
    account: &UncheckedAccount<'a>,
    discriminator: &[u8; 8],
) -> Result<()> {
    let mut data = account.try_borrow_mut_data()?;
    let data_as_byte_array: &mut [u8] = &mut data;
    let mut cursor = std::io::Cursor::new(data_as_byte_array);
    cursor.write_all(discriminator)?;
    Ok(())
}

pub fn create_campaign_treasury_manager_deposit<'a>(
    campaign_treasury_manager_program: AccountInfo<'a>,
    campaign_escrow: AccountInfo<'a>,
    deposit_record: AccountInfo<'a>,
    deposit_escrow: AccountInfo<'a>,
    deposit_escrow_mint: AccountInfo<'a>,
    depositor: AccountInfo<'a>,
    depositor_payment_account: AccountInfo<'a>,
    mint: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    instruction_sysvar_account: AccountInfo<'a>,
    deposit_amount: u64,
) -> Result<()> {
    let accounts = campaign_treasury_manager::cpi::accounts::CreateDeposit {
        campaign_escrow,
        deposit_record,
        deposit_escrow,
        depositor,
        depositor_payment_account,
        mint,
        deposit_escrow_mint,
        token_program,
        system_program,
        instruction_sysvar_account,
    };

    let context = CpiContext::new(campaign_treasury_manager_program, accounts);

    campaign_treasury_manager::cpi::create_deposit(context, deposit_amount)
}

/// Lifted from gumdrop, candy-machine, etc.
/// Returns true if a `leaf` can be proved to be a part of a Merkle tree
/// defined by `root`. For this, a `proof` must be provided, containing
/// sibling hashes on the branch from the leaf to the root of the tree. Each
/// pair of leaves and each pair of pre-images are assumed to be sorted.
pub fn verify_merkle_proof(proof: &[[u8; 32]], root: [u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed_hash = leaf;
    for proof_element in proof.iter() {
        let proof_element = *proof_element;
        if computed_hash <= proof_element {
            // Hash(current computed hash + current element of the proof)
            computed_hash =
                solana_program::keccak::hashv(&[&[0x01], &computed_hash, &proof_element]).0;
        } else {
            // Hash(current element of the proof + current computed hash)
            computed_hash =
                solana_program::keccak::hashv(&[&[0x01], &proof_element, &computed_hash]).0;
        }
    }
    // Check if the computed hash (root) is equal to the provided root
    computed_hash == root
}

#[cfg(test)]
mod tests {
    use super::*;

    use mpl_token_metadata::state::{Creator, Data, Key, Metadata};

    #[test]
    fn price_diff_test() {
        let base: u64 = 10;
        let sol_decimals: u64 = 9;
        let usdc_decimals: u64 = 6;

        let lamports_per_sol = base.pow(sol_decimals as u32);
        let tenth_lamports_per_sol = base.pow((sol_decimals - 1) as u32);

        let one_usdc = base.pow(usdc_decimals as u32);
        let tenth_of_usdc = base.pow((usdc_decimals - 1) as u32);

        let tests = [
            [tenth_lamports_per_sol, sol_decimals, tenth_lamports_per_sol],
            [lamports_per_sol, sol_decimals, tenth_lamports_per_sol],
            [
                tenth_lamports_per_sol * 14,
                sol_decimals,
                tenth_lamports_per_sol,
            ],
            [
                tenth_lamports_per_sol * 16,
                sol_decimals,
                tenth_lamports_per_sol,
            ],
            [
                lamports_per_sol * 5,
                sol_decimals,
                tenth_lamports_per_sol * 5,
            ],
            [lamports_per_sol * 10, sol_decimals, lamports_per_sol],
            [lamports_per_sol * 20, sol_decimals, lamports_per_sol * 2],
            [tenth_of_usdc, usdc_decimals, tenth_of_usdc],
            [one_usdc, usdc_decimals, tenth_of_usdc],
            [tenth_of_usdc * 14, usdc_decimals, tenth_of_usdc],
            [tenth_of_usdc * 16, usdc_decimals, tenth_of_usdc],
            [one_usdc * 5, usdc_decimals, tenth_of_usdc * 5],
            [one_usdc * 10, usdc_decimals, one_usdc],
            [one_usdc * 20, usdc_decimals, one_usdc * 2],
            // Make sure 0 decimals works!
            [100, 0, 10],
            [494, 0, 49],
            [1234, 0, 123],
        ];

        for test in tests {
            let result = get_min_price_diff_in_lamports(test[0], 0, test[1] as u8);
            assert_eq!(result.unwrap(), test[2]);
        }

        let tick_size_constant_in_lamports = 5;
        let constant_result = get_min_price_diff_in_lamports(1, tick_size_constant_in_lamports, 9);
        assert_eq!(constant_result.unwrap(), tick_size_constant_in_lamports);
    }

    fn get_metadata(creator_pubkeys: Option<Vec<Pubkey>>, primary_sale_happened: bool) -> Metadata {
        let creators = match creator_pubkeys {
            Some(creator_pubkeys_some) => Some(
                creator_pubkeys_some
                    .iter()
                    .map(|pubkey| Creator {
                        address: pubkey.clone(),
                        // These fields don't matter for our test
                        share: 50,
                        verified: true,
                    })
                    .collect(),
            ),
            None => None,
        };

        let data = Data {
            name: "foo".to_string(),
            symbol: "test".to_string(),
            uri: "wat".to_string(),
            seller_fee_basis_points: 10,
            creators,
        };

        return Metadata {
            programmable_config: None, // TODO[@bonham000]: Revisit this.
            key: Key::MetadataV1,
            update_authority: Pubkey::new_unique(),
            mint: Pubkey::new_unique(),
            data,
            primary_sale_happened,
            is_mutable: true,
            edition_nonce: None,
            token_standard: None,
            collection: None,
            uses: None,
            collection_details: None,
        };
    }

    struct GetHasBeenSoldTestCase {
        expected_result: bool,
        metadata: Metadata,
        last_bid_price: Option<LastBidPrice>,
    }

    #[test]
    fn get_has_been_sold_test() {
        let test_cases = [
            GetHasBeenSoldTestCase {
                expected_result: false,
                metadata: get_metadata(None, false),
                last_bid_price: None,
            },
            GetHasBeenSoldTestCase {
                expected_result: false,
                metadata: get_metadata(None, false),
                last_bid_price: Some(LastBidPrice {
                    price: 0,
                    bidder: None,
                    has_been_sold: 0,
                    tick_size_constant_in_lamports: 0,
                    has_campaign_escrow_treasury: false,
                }),
            },
            GetHasBeenSoldTestCase {
                expected_result: true,
                metadata: get_metadata(None, false),
                last_bid_price: Some(LastBidPrice {
                    price: 0,
                    bidder: None,
                    has_been_sold: 1,
                    tick_size_constant_in_lamports: 0,
                    has_campaign_escrow_treasury: false,
                }),
            },
            GetHasBeenSoldTestCase {
                expected_result: true,
                metadata: get_metadata(None, true),
                last_bid_price: None,
            },
            GetHasBeenSoldTestCase {
                expected_result: true,
                metadata: get_metadata(None, true),
                last_bid_price: Some(LastBidPrice {
                    price: 0,
                    bidder: None,
                    has_been_sold: 0,
                    tick_size_constant_in_lamports: 0,
                    has_campaign_escrow_treasury: false,
                }),
            },
            GetHasBeenSoldTestCase {
                expected_result: true,
                metadata: get_metadata(None, true),
                last_bid_price: Some(LastBidPrice {
                    price: 0,
                    bidder: None,
                    has_been_sold: 1,
                    tick_size_constant_in_lamports: 0,
                    has_campaign_escrow_treasury: false,
                }),
            },
        ];

        for test_case in test_cases.iter() {
            let result = get_has_been_sold(
                &test_case.metadata,
                match &test_case.last_bid_price {
                    None => None,
                    Some(last_bid_price) => Some(&last_bid_price),
                },
            );
            assert_eq!(result, test_case.expected_result);
        }
    }

    struct ShouldSplitPrimarySaleTestCase {
        expected_result: bool,
        metadata: Metadata,
        seller: Pubkey,
        has_been_sold: bool,
    }

    #[test]
    fn should_split_primary_sale_test() {
        let pubkey1 = Pubkey::new_unique();
        let pubkey2 = Pubkey::new_unique();
        let pubkey3 = Pubkey::new_unique();

        let test_cases = [
            ShouldSplitPrimarySaleTestCase {
                expected_result: false,
                metadata: get_metadata(Some([].to_vec()), false),
                seller: pubkey1,
                has_been_sold: false,
            },
            ShouldSplitPrimarySaleTestCase {
                expected_result: false,
                metadata: get_metadata(None, true),
                seller: pubkey1,
                has_been_sold: false,
            },
            ShouldSplitPrimarySaleTestCase {
                expected_result: false,
                metadata: get_metadata(Some([pubkey1].to_vec()), false),
                seller: pubkey1,
                has_been_sold: false,
            },
            ShouldSplitPrimarySaleTestCase {
                expected_result: false,
                metadata: get_metadata(Some([pubkey2, pubkey3].to_vec()), false),
                seller: pubkey1,
                has_been_sold: false,
            },
            ShouldSplitPrimarySaleTestCase {
                expected_result: true,
                metadata: get_metadata(Some([pubkey1, pubkey3].to_vec()), false),
                seller: pubkey1,
                has_been_sold: false,
            },
            ShouldSplitPrimarySaleTestCase {
                expected_result: false,
                metadata: get_metadata(Some([pubkey1, pubkey3].to_vec()), false),
                seller: pubkey1,
                has_been_sold: true,
            },
        ];

        for test_case in test_cases.iter() {
            let result = should_split_primary_sale(
                &test_case.metadata,
                &test_case.seller,
                test_case.has_been_sold,
            );
            assert_eq!(result, test_case.expected_result);
        }
    }

    #[test]
    fn assert_valid_edition_sale_times_test() {
        // Normal times.
        let result = assert_valid_edition_sale_times(Some(1), 2, Some(3), 0);
        assert!(result.is_ok());

        // Public sale 0 with allowlist to represent allowlist-only sale.
        let result = assert_valid_edition_sale_times(Some(1), 0, Some(2), 0);
        assert!(result.is_ok());

        // No allowlist time.
        let result = assert_valid_edition_sale_times(None, 1, Some(2), 0);
        assert!(result.is_ok());

        // Allowlist at same time as public sale.
        let result = assert_valid_edition_sale_times(Some(1), 1, Some(3), 0);
        assert!(result.is_err());

        // Allowlist sale time after sale end time.
        let result = assert_valid_edition_sale_times(Some(4), 5, Some(2), 0);
        assert!(result.is_err());

        // Public sale time after sale end time.
        let result = assert_valid_edition_sale_times(Some(1), 3, Some(2), 0);
        assert!(result.is_err());

        // Public sale time cannot be 0 without an allowlist start time.
        let result = assert_valid_edition_sale_times(None, 0, Some(2), 0);
        assert!(result.is_err());
    }
}
