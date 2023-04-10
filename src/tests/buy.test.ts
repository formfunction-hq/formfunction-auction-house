import { ixToTx, transfer } from "@formfunction-hq/formfunction-program-shared";
import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import dayjs from "dayjs";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import auctionHouseSetLastBidPriceIx from "solana/instructions/auctionHouseSetLastBidPriceIx";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
  ZERO_PUBKEY,
} from "tests/constants/AuctionHouse";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import NftTransactionType from "tests/types/enums/NftTransactionType";
import buy from "tests/utils/buy";
import expectFunctionToFailWithErrorCode from "tests/utils/errors/expectFunctionToFailWithErrorCode";
import expectTransactionToFailWithErrorCode from "tests/utils/errors/expectTransactionToFailWithErrorCode";
import executeSale from "tests/utils/executeSale";
import getBuyerEscrowLamports from "tests/utils/getBuyerEscrowLamports";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getProgram from "tests/utils/getProgram";
import getTestSetup from "tests/utils/getTestSetup";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import sell from "tests/utils/sell";
import getNftTxs from "tests/utils/txs/getNftTxs";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import SaleType from "types/enum/SaleType";

let tokenMint: PublicKey;
let tokenAccount: PublicKey;
let buyerTokenAccount: PublicKey;
let auctionHouseSdk: AuctionHouseSdk;
let sellers: Array<Keypair>;
let buyers: Array<Keypair>;
let metadataData: DataV2;

let buyer: Keypair;
let buyer2: Keypair;
let seller: Keypair;
let seller2: Keypair;

const connection = getConnectionForTest();

// Use lower buy price to avoid running out of SOL
const BUY_PRICE = 1;

// Use different wallet creator to isolate auction house from other tests
const programCreator = getProgram(WALLET_CREATOR);

async function cancelBuy(priceInSol: number, wallet: PublicKey) {
  const cancelTx = await auctionHouseSdk.withdrawAndCancelTx(
    {
      receiptAccount: wallet,
      tokenAccount,
      tokenMint,
      wallet,
    },
    {
      amount: priceInSol * LAMPORTS_PER_SOL,
    }
  );
  // Cancel as authority
  await sendTransactionWithWallet(connection, cancelTx, WALLET_CREATOR);
}

describe("buy tests (placing bids/offers)", () => {
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
    buyer = buyers[0];
    buyer2 = buyers[1];
    seller = sellers[0];
    seller2 = sellers[1];
  });

  // Skip as it takes too long to wait for finalized for each test, re-enable as needed
  xit.each([SaleType.InstantSale, SaleType.Offer])(
    `executing buy with sale type %i should not set last bid price`,
    async (saleType: SaleType) => {
      await buy(
        connection,
        auctionHouseSdk,
        BUY_PRICE / 100,
        tokenMint,
        tokenAccount,
        buyer2,
        buyer.publicKey,
        saleType
      );

      const [lastBidPrice] = findLastBidPrice(
        tokenMint,
        auctionHouseSdk.program.programId
      );
      const lastBidPriceAccount =
        await programCreator.account.lastBidPrice.fetch(lastBidPrice);
      expect(lastBidPriceAccount.price.toString()).toEqual("0");
      expect(lastBidPriceAccount.bidder).toBe(null);
      await cancelBuy(BUY_PRICE / 100, buyer2.publicKey);
    }
  );

  it("buy", async () => {
    // Seller lists
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE
    );

    // First, buy with someone else
    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE / 10,
      tokenMint,
      tokenAccount,
      buyer2,
      buyer.publicKey
    );
    // Check that escrow account has been transferred enough lamports.
    const escrowPaymentAccountLamportsBefore = await getBuyerEscrowLamports(
      connection,
      auctionHouseSdk,
      buyer2,
      tokenMint
    );
    expect(escrowPaymentAccountLamportsBefore).toEqual(
      Number((BUY_PRICE / 10) * LAMPORTS_PER_SOL)
    );

    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE / 2,
      tokenMint,
      tokenAccount,
      buyer,
      buyer2.publicKey
    );
    // After another bid is placed, make sure the first buyer got refunded
    const escrowPaymentAccountLamports = await getBuyerEscrowLamports(
      connection,
      auctionHouseSdk,
      buyer2,
      tokenMint
    );
    expect(escrowPaymentAccountLamports).toBe(0);

    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey
    );

    const nftTxs = await getNftTxs(
      connection,
      tokenMint,
      1000,
      "afterBuy.json"
    );
    const buyTx = nftTxs[0];
    expect(buyTx.fromAddress).toEqual(buyer.publicKey.toString());
    expect(buyTx.toAddress).toEqual(buyer.publicKey.toString());
    expect(buyTx.type).toEqual(NftTransactionType.Bid);

    const [lastBidPrice] = findLastBidPrice(
      tokenMint,
      auctionHouseSdk.program.programId
    );
    const lastBidPriceAccount = await programCreator.account.lastBidPrice.fetch(
      lastBidPrice
    );
    expect(lastBidPriceAccount.price.toString()).toEqual(
      (BUY_PRICE * LAMPORTS_PER_SOL).toString()
    );
  });

  it("buy too low", async () => {
    // Cancel previous bid at this price first, otherwise will encounter
    // different error (trade state already initialized)
    const cancelTx = await auctionHouseSdk.cancelTx(
      {
        priceInLamports: (BUY_PRICE / 2) * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );
    // Need to do as separate tx so data gets cleared after taking away rent
    await sendTransactionWithWallet(connection, cancelTx, WALLET_CREATOR);

    // Lower bid should now fail (see previous test)
    expectFunctionToFailWithErrorCode({
      errorName: "BidTooLow",
      fn: () =>
        buy(
          connection,
          auctionHouseSdk,
          BUY_PRICE / 2,
          tokenMint,
          tokenAccount,
          buyer,
          buyer.publicKey
        ),
    });

    const tx1 = await auctionHouseSdk.buyV2Tx(
      {
        previousBidderWallet: buyer.publicKey,
        priceInLamports: BUY_PRICE * 2 * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );

    const tx2 = await auctionHouseSdk.buyV2Tx(
      {
        previousBidderWallet: buyer.publicKey,
        priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );

    // Cancel previous bid at this price first, otherwise will encounter
    // different error (trade state already initialized)
    const cancelTx2 = await auctionHouseSdk.cancelTx(
      {
        priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );
    // Need to do as separate tx so data gets cleared after taking away rent
    await sendTransactionWithWallet(connection, cancelTx2, WALLET_CREATOR);

    tx1.add(...tx2.instructions);
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "BidTooLow",
      signers: [buyer],
      transaction: tx1,
    });
  });

  it("buy too late", async () => {
    const tx = await auctionHouseSdk.buyV2Tx(
      {
        previousBidderWallet: buyer.publicKey,
        priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      { auctionEndTime: dayjs().subtract(2, "day") }
    );
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "BidTooLate",
      signers: [buyer],
      transaction: tx,
    });
  });

  it("cannot place offer on in-progress auction", async () => {
    const tx = await auctionHouseSdk.buyV2MakeOfferTx(
      {
        previousBidderWallet: buyer.publicKey,
        priceInLamports: BUY_PRICE * 2 * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "CannotPlaceOfferWhileOnAuction",
      signers: [buyer],
      transaction: tx,
    });
  });

  it("incorrect previous bidder", async () => {
    const [lastBidPrice] = await auctionHouseSdk.findLastBidPrice(tokenMint);
    const lastBidPriceAccount =
      await auctionHouseSdk.program.account.lastBidPrice.fetch(lastBidPrice);
    // Previous bidder is buyer
    expect(lastBidPriceAccount.bidder?.equals(buyer.publicKey)).toEqual(true);

    const tx = await auctionHouseSdk.buyV2Tx(
      {
        // Previous bidder as buyer2 should fail
        previousBidderWallet: buyer2.publicKey,
        priceInLamports: BUY_PRICE * 2 * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "PreviousBidderIncorrect",
      signers: [buyer],
      transaction: tx,
    });

    const tx2 = await auctionHouseSdk.buyV2Tx(
      {
        // Previous bidder as buyer should succeed
        previousBidderWallet: buyer.publicKey,
        priceInLamports: BUY_PRICE * 2 * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );
    await expect(
      sendTransactionWithWallet(connection, tx2, buyer)
    ).resolves.not.toThrow();
  });

  it("ZERO_PUBKEY is treated as null when checking for incorrect previous bidder", async () => {
    // Execute sale to reset
    await executeSale(
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
      BUY_PRICE * 2,
      BUY_PRICE,
      undefined
    );

    // Transfer it back
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );

    const [lastBidPrice] = await auctionHouseSdk.findLastBidPrice(tokenMint);
    const lastBidPriceAccount =
      await auctionHouseSdk.program.account.lastBidPrice.fetch(lastBidPrice);
    // Previous bidder is ZERO_PUBKEY, price should be 0 now
    expect(lastBidPriceAccount.price.toNumber()).toEqual(0);
    expect(lastBidPriceAccount.bidder?.equals(ZERO_PUBKEY)).toEqual(true);

    const setLastBidPriceIx = await auctionHouseSetLastBidPriceIx(
      {
        auctionHouse: auctionHouseSdk.auctionHouse,
        auctionHouseProgramId: auctionHouseSdk.program.programId,
        authority: auctionHouseSdk.walletAuthority,
        owner: seller.publicKey,
        program: auctionHouseSdk.program,
        tokenAccount,
        tokenMint,
      },
      { price: BUY_PRICE * LAMPORTS_PER_SOL }
    );
    await sendTransactionWithWallet(
      connection,
      ixToTx(setLastBidPriceIx),
      WALLET_CREATOR
    );

    const lastBidPriceAccountAfter =
      await auctionHouseSdk.program.account.lastBidPrice.fetch(lastBidPrice);
    // Price should now be BUY_PRICE
    expect(lastBidPriceAccountAfter.price.toNumber()).toEqual(
      BUY_PRICE * LAMPORTS_PER_SOL
    );
    expect(lastBidPriceAccountAfter.bidder?.equals(ZERO_PUBKEY)).toEqual(true);

    const tx2 = await auctionHouseSdk.buyV2Tx(
      {
        // Previous bidder as buyer should succeed
        previousBidderWallet: buyer.publicKey,
        priceInLamports: BUY_PRICE * 2 * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );
    await expect(
      sendTransactionWithWallet(connection, tx2, buyer)
    ).resolves.not.toThrow();
  });
});
