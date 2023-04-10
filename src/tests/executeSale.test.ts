import {
  getTokenAccountInfo,
  getTokenAmount,
  ixToTx,
  requestAirdrops,
  transfer,
} from "@formfunction-hq/formfunction-program-shared";
import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";
import { createRevokeInstruction } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import auctionHouseThawDelegatedAccountIx from "solana/instructions/auctionHouseThawDelegatedAccountIx";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import {
  AUCTION_HOUSE_PROGRAM_ID,
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
  BUY_PRICE,
  ZERO_PUBKEY,
} from "tests/constants/AuctionHouse";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import { IS_NATIVE } from "tests/setup";
import buy from "tests/utils/buy";
import expectFunctionToFailWithErrorCode from "tests/utils/errors/expectFunctionToFailWithErrorCode";
import executeSale from "tests/utils/executeSale";
import fundSplTokenAtas from "tests/utils/fundSplTokenAccount";
import getBalance from "tests/utils/getBalance";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getProgram from "tests/utils/getProgram";
import getTestSetup from "tests/utils/getTestSetup";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import getTreasuryWithdrawalDestination from "tests/utils/getTreasuryWithdrawalDestination";
import resetTradeState from "tests/utils/resetTradeState";
import sell from "tests/utils/sell";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import verifyDelegateAndFrozen from "tests/utils/verifyDelegateAndFrozen";
import SaleType from "types/enum/SaleType";

// NOTE: use existing tokenMint to make test faster.
// Use new tokenMint to test everything from scratch.
// let tokenMint: PublicKey = new PublicKey(
//   "2VkhToHLLb3jwZRwmsbx74wVf3i5UHziSU7Fjyp19V9W"
// );
let tokenMint: PublicKey;
let tokenAccount: PublicKey;
let buyerTokenAccount: PublicKey;
let auctionHouseSdk: AuctionHouseSdk;
let sellers: Array<Keypair>;
let buyers: Array<Keypair>;
let metadataData: DataV2;

let buyer: Keypair;
let seller: Keypair;
let seller2: Keypair;
let sellersForExecuteSale: Array<{
  basisPoints: number;
  isExecutingSale: boolean;
  share: number;
  tokenAccount?: PublicKey;
  wallet: Keypair;
}>;

const connection = getConnectionForTest();

// Use different wallet creator to isolate auction house from other tests
const programCreator = getProgram(WALLET_CREATOR);

async function checkSellerTokenAmount(amount: number) {
  const sellerTokenAmountBefore = await getTokenAmount(
    connection,
    tokenAccount
  );
  expect(sellerTokenAmountBefore).toEqual(amount);
}

async function acceptOfferAsSeller(buyPrice: number) {
  const tx = await auctionHouseSdk.sellAcceptOfferTx(
    {
      buyerReceiptTokenAccount: buyerTokenAccount,
      priceInLamports: buyPrice * LAMPORTS_PER_SOL,
      tokenAccount,
      tokenMint,
      wallet: seller.publicKey,
      walletBuyer: buyer.publicKey,
      walletCreator: seller.publicKey,
      walletSeller: seller.publicKey,
    },
    {},
    [
      {
        isSigner: true,
        isWritable: true,
        pubkey: seller.publicKey,
      },
      {
        isSigner: false,
        isWritable: true,
        pubkey: seller2.publicKey,
      },
    ]
  );

  await checkSellerTokenAmount(1);
  await sendTransactionWithWallet(connection, tx, seller);
  await checkSellerTokenAmount(0);
}

describe("execute sale tests", () => {
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

    sellersForExecuteSale = [
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
    ];
  });

  beforeEach(async () => {
    await requestAirdrops({ connection, wallets: [...buyers, ...sellers] });
    await fundSplTokenAtas(connection, [...buyers, ...sellers]);
  });

  it("execute sale—same price (and check that hasBeenSold gets set to true)", async () => {
    // Seller lists
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE
    );
    // Bidder places bid
    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey
    );

    const [lastBidPrice] = findLastBidPrice(
      tokenMint,
      auctionHouseSdk.program.programId
    );
    const lastBidPriceAccountBefore =
      await programCreator.account.lastBidPrice.fetch(lastBidPrice);
    expect(lastBidPriceAccountBefore.hasBeenSold).toEqual(0);

    await executeSale(
      connection,
      auctionHouseSdk,
      tokenMint,
      { tokenAccount: buyerTokenAccount, wallet: buyer },
      sellersForExecuteSale,
      BUY_PRICE,
      BUY_PRICE
    );

    const lastBidPriceAccountAfter =
      await programCreator.account.lastBidPrice.fetch(lastBidPrice);
    expect(lastBidPriceAccountAfter.price.toString()).toEqual("0");
    expect(lastBidPriceAccountAfter.bidder?.equals(ZERO_PUBKEY)).toEqual(true);
    expect(lastBidPriceAccountAfter.hasBeenSold).toEqual(1);

    await verifyDelegateAndFrozen(
      connection,
      tokenMint,
      tokenAccount,
      seller,
      programCreator.programId,
      false
    );
  });

  it("execute sale—different price", async () => {
    const buyPrice = 11;
    const sellPrice = 10;

    // Transfer it back
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      sellPrice
    );
    await buy(
      connection,
      auctionHouseSdk,
      buyPrice,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey
    );
    await executeSale(
      connection,
      auctionHouseSdk,
      tokenMint,
      { tokenAccount: buyerTokenAccount, wallet: buyer },
      sellersForExecuteSale,
      buyPrice,
      sellPrice
    );
    await verifyDelegateAndFrozen(
      connection,
      tokenMint,
      tokenAccount,
      seller,
      programCreator.programId,
      false
    );
  });

  it("execute sale does not work with invalid buyer receipt token account", async () => {
    const buyPrice = 11;
    const sellPrice = 10;

    // Transfer it back
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      sellPrice
    );
    await buy(
      connection,
      auctionHouseSdk,
      buyPrice,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey
    );

    const executeSaleHelper = (buyerTokenAccountInner: PublicKey) =>
      executeSale(
        connection,
        auctionHouseSdk,
        tokenMint,
        { tokenAccount: buyerTokenAccountInner, wallet: buyer },
        sellersForExecuteSale,
        buyPrice,
        sellPrice
      );

    // Try with random keypair as token account
    const randomKeypair = Keypair.generate();
    await expectFunctionToFailWithErrorCode({
      errorName: "MissingAccount",
      fn: () => executeSaleHelper(randomKeypair.publicKey),
    });

    // Incorrect owner (tokenAccount is not owned by buyer)
    await expectFunctionToFailWithErrorCode({
      errorName: "IncorrectOwner",
      fn: () => executeSaleHelper(tokenAccount),
    });

    // Actually execute the sale so subsequent tests can run
    // TODO: should decouple all the test in this module from each other
    await expect(executeSaleHelper(buyerTokenAccount)).resolves.not.toThrow();
  });

  it("execute sale—after revoking", async () => {
    const buyPrice = 10;
    const sellPrice = 10;

    // Transfer it back
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );

    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      sellPrice
    );
    // Thaw first as revoke cannot happen when frozen
    const thawTx = ixToTx(
      await auctionHouseThawDelegatedAccountIx({
        auctionHouse: auctionHouseSdk.auctionHouse,
        auctionHouseProgramId: AUCTION_HOUSE_PROGRAM_ID,
        authority: auctionHouseSdk.walletAuthority,
        program: auctionHouseSdk.program,
        tokenAccount,
        tokenMint,
        walletSeller: seller.publicKey,
      })
    );
    thawTx.add(createRevokeInstruction(tokenAccount, seller.publicKey, []));
    await sendTransactionWithWallet(connection, thawTx, seller);
    await buy(
      connection,
      auctionHouseSdk,
      buyPrice,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey
    );

    const tx = await auctionHouseSdk.executeSaleV2Tx(
      {
        buyerPriceInLamports: buyPrice * LAMPORTS_PER_SOL,
        buyerReceiptTokenAccount: buyerTokenAccount,
        sellerPriceInLamports: sellPrice * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: WALLET_CREATOR.publicKey,
        walletBuyer: buyer.publicKey,
        // Naming here is a bit confusing... walletCreator refers to creator of NFT
        walletCreator: seller.publicKey,
        walletSeller: seller.publicKey,
      },
      {},
      [
        {
          isSigner: false,
          isWritable: true,
          pubkey: seller.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: seller2.publicKey,
        },
      ]
    );
    // Do this instead of calling executeSale, because executeSale signs with WALLET_CREATOR
    await sendTransactionWithWallet(connection, tx, seller);
    await verifyDelegateAndFrozen(
      connection,
      tokenMint,
      tokenAccount,
      seller,
      programCreator.programId,
      false
    );
  });

  it("execute sale v2 as seller revokes program as signer as delegate", async () => {
    // Transfer it back to seller
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );

    // Seller lists, program as signer should be a delegate
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE
    );
    // Bidder places bid
    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey
    );

    await executeSale(
      connection,
      auctionHouseSdk,
      tokenMint,
      { tokenAccount: buyerTokenAccount, wallet: buyer },
      sellersForExecuteSale,
      BUY_PRICE,
      BUY_PRICE,
      seller
    );

    const tokenAccountInfoAfter = await getTokenAccountInfo(
      connection,
      tokenAccount
    );
    expect(tokenAccountInfoAfter.delegate).toBe(null);
  });

  it("execute sale for offer as seller works as expected", async () => {
    const buyPrice = 5;
    // Transfer it back to seller
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );

    // Buyer makes an offer
    await buy(
      connection,
      auctionHouseSdk,
      buyPrice,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.Offer
    );

    // Check that this works
    await expect(acceptOfferAsSeller(buyPrice)).resolves.not.toThrow();
  });

  it.each([
    [5, 5, SaleType.Auction],
    [5, 10, SaleType.Auction],
    [5, 5, SaleType.InstantSale],
    [5, 10, SaleType.InstantSale],
  ])(
    "execute sale for offer as seller works as expected when piece is listed for %i SOL and offer is for %i SOL with sale type %i",
    async (
      buyPriceInSol: number,
      listingPriceInSol: number,
      saleType: SaleType
    ) => {
      // Transfer it back to seller
      await transfer(
        connection,
        buyer,
        buyerTokenAccount,
        tokenMint,
        tokenAccount
      );

      // Seller lists
      await sell(
        connection,
        auctionHouseSdk,
        tokenMint,
        tokenAccount,
        seller,
        listingPriceInSol,
        saleType
      );

      // Buyer makes an offer
      await buy(
        connection,
        auctionHouseSdk,
        buyPriceInSol,
        tokenMint,
        tokenAccount,
        buyer,
        buyer.publicKey,
        SaleType.Offer
      );

      const [tradeStateAddress] = await auctionHouseSdk.findTradeState(
        seller.publicKey,
        tokenAccount,
        tokenMint,
        buyPriceInSol * LAMPORTS_PER_SOL
      );
      const tradeStateAccount = await connection.getAccountInfo(
        tradeStateAddress
      );
      if (buyPriceInSol === listingPriceInSol) {
        expect(tradeStateAccount).not.toBe(null);
        expect(tradeStateAccount!.data[1]).toEqual(saleType);
      } else {
        expect(tradeStateAccount).toBe(null);
      }
      await expect(acceptOfferAsSeller(buyPriceInSol)).resolves.not.toThrow();
      if (buyPriceInSol !== listingPriceInSol) {
        // Cancel the listing trade state to not mess up future listings
        await resetTradeState(auctionHouseSdk, connection, {
          priceInSol: listingPriceInSol,
          tokenAccount,
          tokenMint,
          wallet: seller.publicKey,
        });
      }
    }
  );

  it("execute sale must use highest bid price", async () => {
    const listingPrice = 1;
    const bidPrice1 = 1.5;
    const bidPrice2 = 2.5;

    // Transfer it back to seller
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );

    // Seller lists
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      listingPrice
    );

    // Buyer 1 places a bid
    await buy(
      connection,
      auctionHouseSdk,
      bidPrice1,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.Auction,
      false
    );

    // Buyer 1 places another bid
    await buy(
      connection,
      auctionHouseSdk,
      bidPrice2,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.Auction,
      false
    );

    await expectFunctionToFailWithErrorCode({
      errorName: "MismatchedPrices",
      fn: () =>
        executeSale(
          connection,
          auctionHouseSdk,
          tokenMint,
          {
            tokenAccount: buyerTokenAccount,
            wallet: buyer,
          },
          sellersForExecuteSale,
          // This should fail, because we didn't use the highest bid price
          bidPrice1,
          listingPrice
        ),
    });

    // Actually execute the sale so subsequent tests can run
    // TODO: should decouple all the test in this module from each other
    await executeSale(
      connection,
      auctionHouseSdk,
      tokenMint,
      {
        tokenAccount: buyerTokenAccount,
        wallet: buyer,
      },
      sellersForExecuteSale,
      bidPrice2,
      listingPrice
    );
  });

  it("execute sale for offer as seller does not work if auction has started (i.e., bid already placed)", async () => {
    const buyPrice = 0.5;
    const listingPrice = 1;

    // Transfer it back to seller
    await transfer(
      connection,
      buyer,
      buyerTokenAccount,
      tokenMint,
      tokenAccount
    );

    // Seller lists
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      listingPrice
    );

    // Buyer 1 makes an offer
    await buy(
      connection,
      auctionHouseSdk,
      buyPrice,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.Offer
    );

    // Buyer 1 places a bid
    await buy(
      connection,
      auctionHouseSdk,
      listingPrice,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.Auction,
      false
    );

    await expectFunctionToFailWithErrorCode({
      errorName: "CannotAcceptOfferWhileOnAuction",
      fn: () => acceptOfferAsSeller(buyPrice),
    });
  });

  // Put this here to test that executing sale correctly deposits fees to treasury
  // NOTE: placed at the end as it is least likely to conflict with other tests
  // that execute concurrently and use the same auction house
  it("withdraw from treasury", async () => {
    const balanceBefore = await getBalance(connection, {
      wallet: WALLET_CREATOR.publicKey,
    });
    const { treasuryWithdrawalDestination } =
      await getTreasuryWithdrawalDestination(WALLET_CREATOR.publicKey);
    const tx = await auctionHouseSdk.withdrawFromTreasuryTx(
      {
        treasuryWithdrawalDestination,
      },
      { amount: LAMPORTS_PER_SOL }
    );
    await sendTransactionWithWallet(connection, tx, WALLET_CREATOR);

    const balanceAfter = await getBalance(connection, {
      wallet: WALLET_CREATOR.publicKey,
    });
    expect(balanceAfter - balanceBefore).toEqual(
      IS_NATIVE ? LAMPORTS_PER_SOL - 5000 : LAMPORTS_PER_SOL
    );
  });
});
