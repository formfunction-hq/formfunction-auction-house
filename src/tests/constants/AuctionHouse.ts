import { PublicKey } from "@solana/web3.js";
import { WALLET_CREATOR } from "tests/constants/Wallets";

///
/// LABELS
///
export const AUCTION_HOUSE_LABEL = "auction_house";
export const FEE_PAYER_LABEL = "fee_payer";
export const TREASURY_LABEL = "treasury";

///
/// PROGRAM IDS
///
export const AUCTION_HOUSE_PROGRAM_ID = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

///
/// ACCOUNTS
///
export const FEE_WITHDRAWAL_DESTINATION = WALLET_CREATOR.publicKey;

export const TREASURY_WITHDRAWAL_DESTINATION_OWNER = WALLET_CREATOR.publicKey;

export const ZERO_PUBKEY = new PublicKey(Buffer.from(Array(32).fill(0)));

///
/// PRICES
///

export const BUY_PRICE = 10;
export const BASIS_POINTS = 1_000;
export const BASIS_POINTS_SECONDARY = 100;
export const BASIS_POINTS_100_PERCENT = 10_000;

export const SPL_TOKEN_DECIMALS = 9;

export const BOT_TAX = 10_000_000;
