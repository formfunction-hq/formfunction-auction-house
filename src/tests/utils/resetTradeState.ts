import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import verifyTradeState from "tests/utils/verifyTradeState";

export default async function resetTradeState(
  sdk: AuctionHouseSdk,
  connection: Connection,
  {
    priceInSol,
    tokenAccount,
    tokenMint,
    wallet,
  }: {
    priceInSol: number;
    tokenAccount: PublicKey;
    tokenMint: PublicKey;
    wallet: PublicKey;
  }
) {
  const cancelTx = await sdk.cancelTx(
    {
      priceInLamports: priceInSol * LAMPORTS_PER_SOL,
      tokenAccount,
      tokenMint,
      wallet,
    },
    {}
  );
  // Cancel as authority
  await sendTransactionWithWallet(connection, cancelTx, WALLET_CREATOR);
  // Verify trade state is null
  await verifyTradeState(sdk, connection, {
    expectNull: true,
    priceInSol,
    tokenAccount,
    tokenMint,
    wallet,
  });
}
