import { Connection, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import { WALLET_BUYER } from "tests/constants/Wallets";
import getBalance from "tests/utils/getBalance";

export default async function getBuyerEscrowLamports(
  connection: Connection,
  sdk: AuctionHouseSdk,
  walletBuyer = WALLET_BUYER,
  tokenMint: PublicKey
) {
  const [escrowPaymentAccount] = await sdk.findBuyerEscrow(
    walletBuyer.publicKey,
    tokenMint
  );
  return getBalance(connection, { account: escrowPaymentAccount });
}
