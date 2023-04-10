import { logIfDebug } from "@formfunction-hq/formfunction-program-shared";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import verifyDelegateAndFrozen from "tests/utils/verifyDelegateAndFrozen";
import SaleType from "types/enum/SaleType";

export default async function sell(
  connection: Connection,
  sdk: AuctionHouseSdk,
  tokenMint: PublicKey,
  tokenAccount: PublicKey,
  seller: Keypair,
  priceInSol: number,
  saleType = SaleType.Auction
) {
  logIfDebug("calling sell");
  const accounts = {
    priceInLamports: priceInSol * LAMPORTS_PER_SOL,
    tokenAccount,
    tokenMint,
    wallet: seller.publicKey,
  };
  const args = {};

  const tx = await (saleType === SaleType.Auction
    ? sdk.sellTx(accounts, args)
    : sdk.sellInstantSaleTx(accounts, args));
  await sendTransactionWithWallet(connection, tx, seller);
  logIfDebug("finished calling sell");

  // Check that token account delegate is program as signer
  const [programAsSigner] = await sdk.findProgramAsSigner();
  await verifyDelegateAndFrozen(
    connection,
    tokenMint,
    tokenAccount,
    seller,
    sdk.program.programId,
    true,
    programAsSigner
  );

  // Check that seller trade state has been created, and that it contains the right bump
  const [tradeState, tradeBump] = await sdk.findTradeState(
    seller.publicKey,
    tokenAccount,
    tokenMint,
    priceInSol * LAMPORTS_PER_SOL
  );
  const sellerTradeState = await connection.getAccountInfo(tradeState);
  expect(sellerTradeState).toBeDefined();
  expect(Number(sellerTradeState!.data[0])).toEqual(tradeBump);
}
