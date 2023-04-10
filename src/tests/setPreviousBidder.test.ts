import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
  BUY_PRICE,
} from "tests/constants/AuctionHouse";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import buy from "tests/utils/buy";
import expectTransactionToFailWithErrorCode from "tests/utils/errors/expectTransactionToFailWithErrorCode";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getProgram from "tests/utils/getProgram";
import getTestSetup from "tests/utils/getTestSetup";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import sell from "tests/utils/sell";

let tokenMint: PublicKey;
let tokenAccount: PublicKey;
let _buyerTokenAccount: PublicKey;
let auctionHouseSdk: AuctionHouseSdk;
let sellers: Array<Keypair>;
let buyers: Array<Keypair>;

let seller: Keypair;
let buyer: Keypair;

const connection = getConnectionForTest();

const programCreator = getProgram(WALLET_CREATOR);

describe("setPreviousBidder tests", () => {
  beforeAll(async () => {
    [
      auctionHouseSdk,
      _buyerTokenAccount,
      tokenAccount,
      tokenMint,
      sellers,
      buyers,
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
    buyer = buyers[0];
  });

  it("set previous bidder fails if auction started and previous bidder is not null", async () => {
    // List
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE / 10
    );

    // Bid
    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE / 10,
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
    expect(lastBidPriceAccountBefore.price.toNumber()).toEqual(
      (BUY_PRICE / 10) * LAMPORTS_PER_SOL
    );
    expect(lastBidPriceAccountBefore.bidder?.equals(buyer.publicKey)).toEqual(
      true
    );

    const tx = await auctionHouseSdk.setPreviousBidderTx(
      {
        tokenMint,
      },
      { bidder: null }
    );
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "CannotOverrideBidderAuctionInProgress",
      signers: [WALLET_CREATOR],
      transaction: tx,
    });
  });
});
