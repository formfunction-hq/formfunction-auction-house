import {
  ixToTx,
  requestAirdrops,
  transfer,
} from "@formfunction-hq/formfunction-program-shared";
import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import auctionHouseBuyV2Ix from "solana/instructions/auctionHouseBuyV2Ix";
import auctionHouseSellIx from "solana/instructions/auctionHouseSellIx";
import auctionHouseSetLastBidPriceIx from "solana/instructions/auctionHouseSetLastBidPriceIx";
import getWalletIfNativeElseAta from "solana/utils/getWalletIfNativeElseAta";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
  BUY_PRICE,
} from "tests/constants/AuctionHouse";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import buy from "tests/utils/buy";
import expectFunctionToFailWithErrorCode from "tests/utils/errors/expectFunctionToFailWithErrorCode";
import expectTransactionToFailWithErrorCode from "tests/utils/errors/expectTransactionToFailWithErrorCode";
import executeSale from "tests/utils/executeSale";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getProgram from "tests/utils/getProgram";
import getTestSetup from "tests/utils/getTestSetup";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import resetTradeState from "tests/utils/resetTradeState";
import sell from "tests/utils/sell";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import verifyTradeState from "tests/utils/verifyTradeState";
import SaleType from "types/enum/SaleType";

let tokenMint: PublicKey;
let tokenAccount: PublicKey;
let buyerTokenAccount: PublicKey;
let auctionHouseSdk: AuctionHouseSdk;
let sellers: Array<Keypair>;
let buyers: Array<Keypair>;
let metadataData: DataV2;

let seller: Keypair;
let seller2: Keypair;
let buyer: Keypair;

const connection = getConnectionForTest();

// Use different wallet creator to isolate auction house from other tests
const programCreator = getProgram(WALLET_CREATOR);

async function createTradeState(
  priceInSol: number,
  saleType: SaleType,
  wallet: PublicKey,
  allocationSize?: number,
  tokenAccountOverride?: PublicKey
) {
  const tx = await auctionHouseSdk.createTradeStateTx({
    allocationSize,
    priceInLamports: priceInSol * LAMPORTS_PER_SOL,
    saleType,
    tokenAccount: tokenAccountOverride ?? tokenAccount,
    tokenMint,
    wallet,
  });
  await sendTransactionWithWallet(connection, tx, WALLET_CREATOR);

  await verifyTradeState(auctionHouseSdk, connection, {
    expectNull: false,
    priceInSol,
    saleType: allocationSize === 1 ? undefined : saleType,
    size: allocationSize,
    tokenAccount,
    tokenMint,
    wallet,
  });
}

async function resetLastBidPrice() {
  const ix = await auctionHouseSetLastBidPriceIx(
    {
      auctionHouse: auctionHouseSdk.auctionHouse,
      auctionHouseProgramId: auctionHouseSdk.program.programId,
      authority: auctionHouseSdk.walletAuthority,
      owner: seller.publicKey,
      program: auctionHouseSdk.program,
      tokenAccount,
      tokenMint,
    },
    { price: 0 }
  );
  await sendTransactionWithWallet(connection, ixToTx(ix), WALLET_CREATOR);
}

async function executeSaleHelper(priceInSol: number, signer?: Keypair) {
  return executeSale(
    connection,
    auctionHouseSdk,
    tokenMint,
    { tokenAccount: buyerTokenAccount, wallet: buyer },
    [
      {
        basisPoints: BASIS_POINTS,
        isExecutingSale: true,
        share: metadataData.creators![0].share,
        tokenAccount,
        wallet: seller,
      },
      {
        basisPoints: BASIS_POINTS,
        isExecutingSale: false,
        share: metadataData.creators![1].share,
        wallet: seller2,
      },
    ],
    priceInSol,
    priceInSol,
    signer
  );
}

describe("trade state tests", () => {
  beforeAll(async () => {
    [
      auctionHouseSdk,
      buyerTokenAccount,
      tokenAccount,
      tokenMint,
      sellers,
      buyers,
      metadataData,
    ] = await getTestSetup(
      connection,
      {
        basisPoints: BASIS_POINTS,
        basisPointsSecondary: BASIS_POINTS_SECONDARY,
        creator: programCreator,
        treasuryMint: await getTreasuryMint(),
      },
      WALLET_CREATOR
    );
    seller = sellers[0];
    seller2 = sellers[1];
    buyer = buyers[0];
  });

  beforeEach(async () => {
    await requestAirdrops({ connection, wallets: [buyer, seller, seller2] });
  });

  it("verify creating trade state with no allocation size creates it with 130 bytes", async () => {
    await createTradeState(BUY_PRICE, SaleType.InstantSale, seller.publicKey);

    await resetTradeState(auctionHouseSdk, connection, {
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });
  });

  it("verify that trade state cannot be created for token account with amount < 1", async () => {
    await expectFunctionToFailWithErrorCode({
      errorName: "InvalidTokenAccountAmount",
      fn: () =>
        createTradeState(
          BUY_PRICE,
          SaleType.InstantSale,
          seller.publicKey,
          undefined,
          buyerTokenAccount
        ),
    });
  });

  it("verify creating trade state with allocation size creates it with specified size", async () => {
    // Allocate with 1 byte
    const allocationSize = 1;
    await createTradeState(
      BUY_PRICE,
      SaleType.InstantSale,
      seller.publicKey,
      allocationSize
    );

    // Check that re-calling `createTradeState` without cancelling does nothing
    // by ensuring allocation size is the same as before
    const tx = await auctionHouseSdk.createTradeStateTx({
      allocationSize: allocationSize + 1,
      priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
      saleType: SaleType.InstantSale,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "TradeStateAlreadyInitialized",
      signers: [WALLET_CREATOR],
      transaction: tx,
    });

    // Check that re-calling `createTradeState` without cancelling does nothing
    // by ensuring allocation size is the same as before
    await verifyTradeState(auctionHouseSdk, connection, {
      expectNull: false,
      priceInSol: BUY_PRICE,
      size: allocationSize,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });

    // Reset
    await resetTradeState(auctionHouseSdk, connection, {
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });

    const allocationSize2 = 512;
    await createTradeState(
      BUY_PRICE,
      SaleType.InstantSale,
      seller.publicKey,
      allocationSize2
    );

    await resetTradeState(auctionHouseSdk, connection, {
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });
  });

  it("creating trade state prior to calling sell causes error", async () => {
    await createTradeState(BUY_PRICE, SaleType.InstantSale, seller.publicKey);

    // Seller lists
    await expectFunctionToFailWithErrorCode({
      errorName: "TradeStateAlreadyInitialized",
      fn: () =>
        sell(
          connection,
          auctionHouseSdk,
          tokenMint,
          tokenAccount,
          seller,
          BUY_PRICE
        ),
    });

    await resetTradeState(auctionHouseSdk, connection, {
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });
  });

  it("creating trade state prior to calling buy causes error", async () => {
    await createTradeState(BUY_PRICE, SaleType.InstantSale, buyer.publicKey);

    // Buyer places bid
    await expectFunctionToFailWithErrorCode({
      errorName: "TradeStateAlreadyInitialized",
      fn: () =>
        buy(
          connection,
          auctionHouseSdk,
          BUY_PRICE,
          tokenMint,
          tokenAccount,
          buyer,
          buyer.publicKey
        ),
    });

    await resetTradeState(auctionHouseSdk, connection, {
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: buyer.publicKey,
    });
  });

  it("mismatched sale types should throw an error when attempting to execute sale", async () => {
    const price = BUY_PRICE / 2;
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      price,
      SaleType.InstantSale
    );

    // Buyer places bid
    await buy(
      connection,
      auctionHouseSdk,
      price,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.Auction
    );

    // Execute sale should throw
    await expectFunctionToFailWithErrorCode({
      errorName: "SellerBuyerSaleTypeMustMatch",
      fn: () => executeSaleHelper(price, undefined),
    });

    // Reset before next test
    await resetTradeState(auctionHouseSdk, connection, {
      priceInSol: price,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });
    await resetTradeState(auctionHouseSdk, connection, {
      priceInSol: price,
      tokenAccount,
      tokenMint,
      wallet: buyer.publicKey,
    });
    await resetLastBidPrice();
  });

  it("can cancel and re-create trade state on existing listings with trade states", async () => {
    // Manually create trade state with size 1 byte and have seller list
    // without calling create trade state (call sell Ix directly to simulate old listings)
    await createTradeState(BUY_PRICE, SaleType.Auction, seller.publicKey, 1);
    const sellIx = await auctionHouseSellIx(
      {
        auctionHouse: auctionHouseSdk.auctionHouse,
        auctionHouseProgramId: auctionHouseSdk.program.programId,
        authority: auctionHouseSdk.walletAuthority,
        feeAccount: auctionHouseSdk.feeAccount,
        priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
        program: auctionHouseSdk.program,
        tokenAccount,
        tokenMint,
        treasuryMint: auctionHouseSdk.treasuryMint,
        walletSeller: seller.publicKey,
      },
      {}
    );
    await sendTransactionWithWallet(connection, ixToTx(sellIx), seller);

    // Trade state should exist but sale type will not be set
    await verifyTradeState(auctionHouseSdk, connection, {
      expectNull: false,
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });
    await resetTradeState(auctionHouseSdk, connection, {
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });

    // Create trade state manually for seller
    await createTradeState(BUY_PRICE, SaleType.InstantSale, seller.publicKey);

    // Bidder places bid
    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.InstantSale,
      false
    );
    // Sale should execute without issues
    await expect(
      executeSaleHelper(BUY_PRICE, undefined)
    ).resolves.not.toThrow();

    // Transfer it back
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );
  });

  it("buyer cannot execute sale if sale type is not auction", async () => {
    // Seller lists
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE,
      SaleType.Auction
    );

    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.Auction,
      false
    );
    // Sale should not execute with auction sale type and buyer as signer
    await expectFunctionToFailWithErrorCode({
      errorName: "SellerOrAuctionHouseMustSign",
      fn: () => executeSaleHelper(BUY_PRICE, buyer),
    });

    // Sale should execute for auction sale type if authority signs
    await expect(
      executeSaleHelper(BUY_PRICE, undefined)
    ).resolves.not.toThrow();

    // Transfer it back
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );
  });

  it("buyer can execute sale if sale type is instant sale", async () => {
    // Seller lists
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE,
      SaleType.InstantSale
    );

    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.InstantSale,
      false
    );

    // Sale should execute for auction sale type if authority signs
    await expect(executeSaleHelper(BUY_PRICE, buyer)).resolves.not.toThrow();

    // Transfer it back
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );
  });

  it("can execute sale with 'old' trade states (testing for backwards compatibility)", async () => {
    // Call sell and buy ixs directly to use 'old' trade states rather than new ones
    // that are created using createTradeState
    const sellIx = await auctionHouseSellIx(
      {
        auctionHouse: auctionHouseSdk.auctionHouse,
        auctionHouseProgramId: auctionHouseSdk.program.programId,
        authority: auctionHouseSdk.walletAuthority,
        feeAccount: auctionHouseSdk.feeAccount,
        priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
        program: auctionHouseSdk.program,
        tokenAccount,
        tokenMint,
        treasuryMint: auctionHouseSdk.treasuryMint,
        walletSeller: seller.publicKey,
      },
      {}
    );
    await sendTransactionWithWallet(connection, ixToTx(sellIx), seller);
    // Trade state should exist but sale type will not be set
    await verifyTradeState(auctionHouseSdk, connection, {
      expectNull: false,
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
    });

    const buyIx = await auctionHouseBuyV2Ix(
      {
        auctionHouse: auctionHouseSdk.auctionHouse,
        auctionHouseProgramId: auctionHouseSdk.program.programId,
        authority: auctionHouseSdk.walletAuthority,
        feeAccount: auctionHouseSdk.feeAccount,
        previousBidderRefundAccount: await getWalletIfNativeElseAta(
          buyer.publicKey,
          auctionHouseSdk.treasuryMint
        ),
        previousBidderWallet: buyer.publicKey,
        priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
        program: auctionHouseSdk.program,
        tokenAccount,
        tokenMint,
        treasuryMint: auctionHouseSdk.treasuryMint,
        walletBuyer: buyer.publicKey,
      },
      {}
    );
    await sendTransactionWithWallet(connection, ixToTx(buyIx), buyer);
    // Trade state should exist but sale type will not be set
    await verifyTradeState(auctionHouseSdk, connection, {
      expectNull: false,
      priceInSol: BUY_PRICE,
      tokenAccount,
      tokenMint,
      wallet: buyer.publicKey,
    });

    // Sale should execute without issues
    await expect(
      executeSaleHelper(BUY_PRICE, undefined)
    ).resolves.not.toThrow();

    // Transfer it back
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );
  });
});
