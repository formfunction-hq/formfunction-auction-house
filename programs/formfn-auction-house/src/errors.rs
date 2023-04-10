use anchor_lang::prelude::*;

#[error_code]
pub enum AuctionHouseError {
    #[msg("PublicKeyMismatch")]
    PublicKeyMismatch,
    #[msg("InvalidMintAuthority")]
    InvalidMintAuthority,
    #[msg("UninitializedAccount")]
    UninitializedAccount,
    #[msg("IncorrectOwner")]
    IncorrectOwner,
    #[msg("PublicKeysShouldBeUnique")]
    PublicKeysShouldBeUnique,
    #[msg("StatementFalse")]
    StatementFalse,
    #[msg("NotRentExempt")]
    NotRentExempt,
    #[msg("NumericalOverflow")]
    NumericalOverflow,
    #[msg("Expected a sol account but got an spl token account instead")]
    ExpectedSolAccount,
    #[msg("Cannot exchange sol for sol")]
    CannotExchangeSOLForSol,
    #[msg("If paying with sol, sol wallet must be signer")]
    SOLWalletMustSign,
    #[msg("Cannot take this action without auction house signing too")]
    CannotTakeThisActionWithoutAuctionHouseSignOff,
    #[msg("No payer present on this txn")]
    NoPayerPresent,
    #[msg("Derived key invalid")]
    DerivedKeyInvalid,
    #[msg("Metadata doesn't exist")]
    MetadataDoesntExist,
    #[msg("Invalid token amount")]
    InvalidTokenAmount,
    #[msg("Both parties need to agree to this sale")]
    BothPartiesNeedToAgreeToSale,
    #[msg("Cannot match free sales unless the auction house or seller signs off")]
    CannotMatchFreeSalesWithoutAuctionHouseOrSellerSignoff,
    #[msg("This sale requires a signer")]
    SaleRequiresSigner,
    #[msg("Old seller not initialized")]
    OldSellerNotInitialized,
    #[msg("Seller ata cannot have a delegate set")]
    SellerATACannotHaveDelegate,
    #[msg("Buyer ata cannot have a delegate set")]
    BuyerATACannotHaveDelegate,
    #[msg("No valid signer present")]
    NoValidSignerPresent,
    #[msg("BP must be less than or equal to 10000")]
    InvalidBasisPoints,
    #[msg("Buyer price must be greater than or equal to seller price")]
    MismatchedPrices,
    #[msg("Either the seller or auction house must sign")]
    SellerOrAuctionHouseMustSign,
    #[msg("The auction has ended and bids are no longer allowed")]
    BidTooLate,
    #[msg("The bid price is too low")]
    BidTooLow,
    #[msg("Expected a native refund")]
    RefundNotNative,
    #[msg("Previous bidder is incorrect")]
    PreviousBidderIncorrect,
    #[msg("The provided trade state account is already initialized")]
    TradeStateAlreadyInitialized,
    #[msg("Either the buyer or auction house must sign")]
    BuyerOrAuctionHouseMustSign,
    #[msg("Seller and buyer sale type must match")]
    SellerBuyerSaleTypeMustMatch,
    #[msg("Cannot execute sale more than once")]
    CanOnlyExecuteSaleOnce,
    #[msg("Cannot accept offer for piece on auction")]
    CannotAcceptOfferWhileOnAuction,
    #[msg("Cannot place offer for piece on auction")]
    CannotPlaceOfferWhileOnAuction,
    #[msg("Buyer token account cannot have a delegate set")]
    BuyerTokenAccountCannotHaveDelegate,
    #[msg("Invalid master edition account")]
    InvalidMasterEditionAccount,
    #[msg("Invalid master edition supply")]
    InvalidMasterEditionSupply,
    #[msg("Too many price params, max is 6")]
    TooManyPriceParams,
    #[msg("Invalid price params")]
    InvalidPriceParams,
    #[msg("Invalid edition number provided. This edition may have already been bought")]
    InvalidEdition,
    #[msg("Invalid amount on token account. This NFT may no longer be available.")]
    InvalidTokenAccountAmount,
    #[msg("Cannot override bidder when auction in progress")]
    CannotOverrideBidderAuctionInProgress,
    #[msg("The end time must come after the start time")]
    EndTimeMustComeAfterStartTime,
    #[msg("The start time must be in the future")]
    StartTimeMustBeInFuture,
    #[msg("The end time must be in the future")]
    EndTimeMustBeInFuture,
    #[msg("The sale for this edition has not started yet")]
    BuyEditionTooEarly,
    #[msg("The sale for this edition has already ended")]
    BuyEditionTooLate,
    #[msg("The edition at this price has already been bought. Please try again")]
    InvalidEditionPrice,
    #[msg("The tick size is too low, must be at least 0.1 SOL")]
    TickSizeTooLow,
    #[msg("Invalid auction house")]
    InvalidAuctionHouse,
    #[msg("Invalid anti-bot authority")]
    InvalidAntiBotAuthority,
    #[msg("Bot tax collected")]
    BotTaxCollected,
    #[msg("The wallet has already purchased the maximum number of editions")]
    EditionLimitPerAddressExceeded,
    #[msg(
        "The provided treasury mint does not match the treasury mint of the edition distributor"
    )]
    InvalidTreasuryMintForBuyEdition,
    #[msg("Allowlist sale start time must be before public sale")]
    AllowlistSaleMustBeBeforePublicSale,
    #[msg("Allowlist sale start time must be after sale end time")]
    AllowlistSaleCannotBeAfterEndTime,
    #[msg("Public sale start time can only be 0 if an allowlist start time is provided")]
    PublicSaleStartTimeCannotBeZero,
    #[msg("Cannot provide an allowlist sale price unless an allowlist is specified")]
    InvalidAllowlistSalePrice,
    #[msg("Exceeded maximum merkle root count")]
    MaximumRootCountExceeded,
    #[msg("An allowlist proof is required during an allowlist sale")]
    AllowlistProofRequired,
    #[msg("The provided merkle allowlist proof is invalid")]
    InvalidAllowlistProof,
    #[msg("This address has already minted all of its allowlisted editions")]
    AllowlistAmountAlreadyMinted,
}
