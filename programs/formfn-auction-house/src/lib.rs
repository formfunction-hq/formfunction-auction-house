use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod tests;
pub mod utils;

pub use constants::*;
pub use errors::*;
pub use instructions::*;
pub use state::*;

// Run `yarn test` to run tests and the script will automatically change
// this to localnet for you.
anchor_lang::declare_id!("formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC");

#[program]
pub mod auction_house {
    use super::*;

    pub fn withdraw_bonk<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawBonk<'info>>,
    ) -> Result<()> {
        handle_withdraw_bonk(ctx)
    }

    pub fn withdraw_from_fee<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawFromFee<'info>>,
        amount: u64,
    ) -> Result<()> {
        handle_withdraw_from_fee(ctx, amount)
    }

    pub fn withdraw_from_treasury<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawFromTreasury<'info>>,
        amount: u64,
    ) -> Result<()> {
        handle_withdraw_from_treasury(ctx, amount)
    }

    pub fn update_auction_house<'info>(
        ctx: Context<'_, '_, '_, 'info, UpdateAuctionHouse<'info>>,
        seller_fee_basis_points: Option<u16>,
        requires_sign_off: Option<bool>,
        can_change_sale_price: Option<bool>,
        seller_fee_basis_points_secondary: Option<u16>,
        pay_all_fees: Option<bool>,
    ) -> Result<()> {
        handle_update_auction_house(
            ctx,
            seller_fee_basis_points,
            requires_sign_off,
            can_change_sale_price,
            seller_fee_basis_points_secondary,
            pay_all_fees,
        )
    }

    // TODO(@bryancho): add min decimal validation for treasury_mint
    pub fn create_auction_house<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateAuctionHouse<'info>>,
        bump: u8,
        fee_payer_bump: u8,
        treasury_bump: u8,
        seller_fee_basis_points: u16,
        requires_sign_off: bool,
        can_change_sale_price: bool,
        seller_fee_basis_points_secondary: u16,
        pay_all_fees: bool,
    ) -> Result<()> {
        handle_create_auction_house(
            ctx,
            bump,
            fee_payer_bump,
            treasury_bump,
            seller_fee_basis_points,
            requires_sign_off,
            can_change_sale_price,
            seller_fee_basis_points_secondary,
            pay_all_fees,
        )
    }

    pub fn withdraw<'info>(
        ctx: Context<'_, '_, '_, 'info, Withdraw<'info>>,
        escrow_payment_bump: u8,
        amount: u64,
    ) -> Result<()> {
        handle_withdraw(ctx, escrow_payment_bump, amount)
    }

    pub fn deposit<'info>(
        ctx: Context<'_, '_, '_, 'info, Deposit<'info>>,
        escrow_payment_bump: u8,
        amount: u64,
    ) -> Result<()> {
        handle_deposit(ctx, escrow_payment_bump, amount)
    }

    // To support freezing of NFTs upon listing, we also need to
    // thaw NFTs upon delisting (cancel). Since freeze/thaw is done
    // by our Auction House program as the token account delegate,
    // the cancel instruction needs the Auction House 'program_as_signer'
    // PDA which needs a new argument (bump). New arguments cannot be shipped
    // in a backwards compatible way and thus we are introducing a new IX.
    pub fn cancel_v2<'info>(
        ctx: Context<'_, '_, '_, 'info, CancelV2<'info>>,
        buyer_price: u64,
        token_size: u64,
        program_as_signer_bump: u8,
    ) -> Result<()> {
        handle_cancel_v2(ctx, buyer_price, token_size, program_as_signer_bump)
    }

    pub fn execute_sale_v2<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteSaleV2<'info>>,
        escrow_payment_bump: u8,
        free_trade_state_bump: u8,
        program_as_signer_bump: u8,
        buyer_price: u64,
        seller_price: u64,
        token_size: u64,
    ) -> Result<()> {
        handle_execute_sale_v2(
            ctx,
            escrow_payment_bump,
            free_trade_state_bump,
            program_as_signer_bump,
            buyer_price,
            seller_price,
            token_size,
        )
    }

    pub fn sell<'info>(
        ctx: Context<'_, '_, '_, 'info, Sell<'info>>,
        trade_state_bump: u8,
        free_trade_state_bump: u8,
        program_as_signer_bump: u8,
        buyer_price: u64,
        token_size: u64,
    ) -> Result<()> {
        handle_sell(
            ctx,
            trade_state_bump,
            free_trade_state_bump,
            program_as_signer_bump,
            buyer_price,
            token_size,
        )
    }

    // Need a separate ix because this takes in an additional arg
    pub fn buy_v2<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyV2<'info>>,
        trade_state_bump: u8,
        escrow_payment_bump: u8,
        buyer_price: u64,
        token_size: u64,
        // Unix time (seconds since epoch)
        auction_end_time: Option<i64>,
        previous_bidder_escrow_payment_bump: u8,
    ) -> Result<()> {
        handle_buy_v2(
            ctx,
            trade_state_bump,
            escrow_payment_bump,
            buyer_price,
            token_size,
            auction_end_time,
            previous_bidder_escrow_payment_bump,
        )
    }

    pub fn thaw_delegated_account<'info>(
        ctx: Context<'_, '_, '_, 'info, ThawDelegatedAccount<'info>>,
        program_as_signer_bump: u8,
    ) -> Result<()> {
        handle_thaw_delegated_account(ctx, program_as_signer_bump)
    }

    pub fn set_last_bid_price<'info>(
        ctx: Context<'_, '_, '_, 'info, SetLastBidPrice<'info>>,
        price: u64,
    ) -> Result<()> {
        handle_set_last_bid_price(ctx, price)
    }

    pub fn set_previous_bidder<'info>(
        ctx: Context<'_, '_, '_, 'info, SetPreviousBidder<'info>>,
        bidder: Option<Pubkey>,
    ) -> Result<()> {
        handle_set_previous_bidder(ctx, bidder)
    }

    pub fn set_has_been_sold<'info>(
        ctx: Context<'_, '_, '_, 'info, SetHasBeenSold<'info>>,
        has_been_sold: bool,
    ) -> Result<()> {
        handle_set_has_been_sold(ctx, has_been_sold)
    }

    pub fn set_tick_size<'info>(
        ctx: Context<'_, '_, '_, 'info, SetTickSize<'info>>,
        tick_size_constant_in_full_decimals: u64,
        // These are unused, but we may use them later
        tick_size_percent: u8,
        tick_size_min_in_lamports: u64,
        tick_size_max_in_lamports: u64,
    ) -> Result<()> {
        handle_set_tick_size(
            ctx,
            tick_size_constant_in_full_decimals,
            tick_size_percent,
            tick_size_min_in_lamports,
            tick_size_max_in_lamports,
        )
    }

    pub fn create_last_bid_price<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateLastBidPrice<'info>>,
    ) -> Result<()> {
        handle_create_last_bid_price(ctx)
    }

    pub fn create_trade_state<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateTradeState<'info>>,
        trade_state_bump: u8,
        price: u64,
        token_size: u64,
        sale_type: u8,
        trade_state_size: Option<u16>,
    ) -> Result<()> {
        handle_create_trade_state(
            ctx,
            trade_state_bump,
            price,
            token_size,
            sale_type,
            trade_state_size,
        )
    }

    pub fn create_edition_distributor<'info>(
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
        handle_create_edition_distributor(
            ctx,
            edition_bump,
            starting_price_lamports,
            price_function_type,
            price_params,
            allowlist_sale_start_time,
            public_sale_start_time,
            sale_end_time,
            allowlist_sale_price,
        )
    }

    pub fn append_edition_allowlist_merkle_roots<'info>(
        ctx: Context<'_, '_, '_, 'info, AppendEditionAllowlistMerkleRoots<'info>>,
        roots_to_append: Vec<[u8; 32]>,
    ) -> Result<()> {
        handle_append_edition_allowlist_merkle_roots(ctx, roots_to_append)
    }

    pub fn clear_edition_allowlist_merkle_roots<'info>(
        ctx: Context<'_, '_, '_, 'info, ClearEditionAllowlistMerkleRoots<'info>>,
    ) -> Result<()> {
        handle_clear_edition_allowlist_merkle_roots(ctx)
    }

    pub fn close_edition_allowlist_settings_account<'info>(
        ctx: Context<'_, '_, '_, 'info, CloseEditionAllowlistSettingsAccount<'info>>,
    ) -> Result<()> {
        handle_close_edition_allowlist_settings_account(ctx)
    }

    pub fn update_edition_distributor<'info>(
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
        handle_update_edition_distributor(
            ctx,
            edition_bump,
            starting_price_lamports,
            price_function_type,
            price_params,
            new_owner,
            allowlist_sale_start_time,
            public_sale_start_time,
            sale_end_time,
            allowlist_sale_price,
        )
    }

    pub fn set_edition_distributor_bot_protection_enabled<'info>(
        ctx: Context<'_, '_, '_, 'info, SetEditionDistributorBotProtectionEnabled<'info>>,
        anti_bot_protection_enabled: bool,
    ) -> Result<()> {
        handle_set_edition_distributor_bot_protection_enabled(ctx, anti_bot_protection_enabled)
    }

    pub fn set_edition_distributor_limit_per_address<'info>(
        ctx: Context<'_, '_, '_, 'info, SetEditionDistributorLimitPerAddress<'info>>,
        limit_per_address: u16,
    ) -> Result<()> {
        handle_set_edition_distributor_limit_per_address(ctx, limit_per_address)
    }

    pub fn buy_edition_v2<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyEditionV2<'info>>,
        edition_bump: u8,
        // Currently unused, but keep it as an arg in case we ever want to start using it
        requested_edition_number: u64,
        // The price the buyer pays. Validated inside this instruction
        price_in_lamports: u64,
        buyer_edition_info_account_bump: u8,
        buyer_merkle_allowlist_proof_data: Option<BuyerMerkleAllowlistProofData>,
    ) -> Result<()> {
        handle_buy_edition_v2(
            ctx,
            edition_bump,
            requested_edition_number,
            price_in_lamports,
            buyer_edition_info_account_bump,
            buyer_merkle_allowlist_proof_data,
        )
    }

    pub fn close_edition_distributor_token_account<'info>(
        ctx: Context<'_, '_, '_, 'info, CloseEditionDistributorTokenAccount<'info>>,
    ) -> Result<()> {
        handle_close_edition_distributor_token_account(ctx)
    }

    pub fn close_edition_distributor<'info>(
        ctx: Context<'_, '_, '_, 'info, CloseEditionDistributor<'info>>,
    ) -> Result<()> {
        handle_close_edition_distributor(ctx)
    }
}
