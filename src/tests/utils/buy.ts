import { logIfDebug } from "@formfunction-hq/formfunction-program-shared";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { Dayjs } from "dayjs";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import getBuyerEscrowLamports from "tests/utils/getBuyerEscrowLamports";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import SaleType from "types/enum/SaleType";

function getBuyTx(
  sdk: AuctionHouseSdk,
  accounts: {
    previousBidderWallet: PublicKey;
    priceInLamports: number;
    tokenAccount: PublicKey;
    tokenMint: PublicKey;
    wallet: PublicKey;
  },
  args: {
    auctionEndTime?: Dayjs;
    tokenSize?: number;
  },
  saleType: SaleType
) {
  switch (saleType) {
    case SaleType.InstantSale:
      return sdk.buyV2InstantSaleTx(accounts, args);
    case SaleType.Offer:
      return sdk.buyV2MakeOfferTx(accounts, args);
    case SaleType.Auction:
    default:
      return sdk.buyV2Tx(accounts, args);
  }
}

export default async function buy(
  connection: Connection,
  sdk: AuctionHouseSdk,
  priceInSol: number,
  tokenMint: PublicKey,
  tokenAccount: PublicKey,
  walletBuyer: Keypair,
  previousBidderWallet: PublicKey,
  saleType = SaleType.Auction,
  checkEscrow = true
) {
  logIfDebug("calling buy");
  const [lastBidPrice] = await sdk.findLastBidPrice(tokenMint);
  if ((await connection.getAccountInfo(lastBidPrice)) == null) {
    logIfDebug(
      `lastBidPrice at ${lastBidPrice.toString()} not created, creating...`
    );
    const createLastBidPriceTx = await sdk.createLastBidPriceTx({
      tokenMint,
      wallet: WALLET_CREATOR.publicKey,
    });
    await sendTransactionWithWallet(
      connection,
      createLastBidPriceTx,
      WALLET_CREATOR
    );
  }
  const accounts = {
    previousBidderWallet: previousBidderWallet,
    priceInLamports: priceInSol * LAMPORTS_PER_SOL,
    tokenAccount,
    tokenMint,
    wallet: walletBuyer.publicKey,
  };
  const args = {};
  const tx = await getBuyTx(sdk, accounts, args, saleType);
  await sendTransactionWithWallet(connection, tx, walletBuyer);
  logIfDebug("finished calling buy");

  // Check that escrow account has been transferred enough lamports.
  if (checkEscrow) {
    const escrowPaymentAccountLamportsAfter = await getBuyerEscrowLamports(
      connection,
      sdk,
      walletBuyer,
      tokenMint
    );
    expect(escrowPaymentAccountLamportsAfter).toBeDefined();
    expect(escrowPaymentAccountLamportsAfter).toEqual(
      Number(priceInSol * LAMPORTS_PER_SOL)
    );
  }

  // Check that buyer trade state has been created, and it contains the right bump
  const [tradeState, tradeBump] = await sdk.findTradeState(
    walletBuyer.publicKey,
    tokenAccount,
    tokenMint,
    priceInSol * LAMPORTS_PER_SOL
  );
  const buyerTradeState = await connection.getAccountInfo(tradeState);
  expect(buyerTradeState).toBeDefined();
  expect(Number(buyerTradeState!.data[0])).toEqual(tradeBump);
}
