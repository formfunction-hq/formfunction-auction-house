import {
  getTokenAccountInfo,
  logIfDebug,
} from "@formfunction-hq/formfunction-program-shared";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import findAuctionHouseProgramAsSigner from "solana/pdas/findAuctionHouseProgramAsSigner";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
  BUY_PRICE,
} from "tests/constants/AuctionHouse";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import NftTransactionType from "tests/types/enums/NftTransactionType";
import buy from "tests/utils/buy";
import expectEqPubkeys from "tests/utils/expectEqPubkeys";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getProgram from "tests/utils/getProgram";
import getTestSetup from "tests/utils/getTestSetup";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import sell from "tests/utils/sell";
import getNftTxs from "tests/utils/txs/getNftTxs";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import verifyDelegateAndFrozen from "tests/utils/verifyDelegateAndFrozen";
import SaleType from "types/enum/SaleType";

let tokenMint: PublicKey;
let tokenAccount: PublicKey;
let _buyerTokenAccount: PublicKey;
let auctionHouseSdk: AuctionHouseSdk;
let sellers: Array<Keypair>;
let buyers: Array<Keypair>;

let seller: Keypair;
let buyer: Keypair;

const connection = getConnectionForTest();

// Use different wallet creator to isolate auction house from other tests
const programCreator = getProgram(WALLET_CREATOR);

describe("cancel tests", () => {
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

  it("cancel", async () => {
    // Seller lists
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE
    );

    // Make sure that before cancelling, token account delegate is program as signer
    const tokenAccountInfo = await getTokenAccountInfo(
      connection,
      tokenAccount
    );
    const [programAsSigner, _programAsSignerBump] =
      findAuctionHouseProgramAsSigner(programCreator.programId);
    logIfDebug(
      "before cancel, tokenAccountInfo.delegate",
      tokenAccountInfo.delegate?.toString()
    );
    expectEqPubkeys(tokenAccountInfo.delegate!, programAsSigner);

    logIfDebug("cancelling...");
    try {
      const tx = await auctionHouseSdk.cancelTx(
        {
          priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
          tokenAccount,
          tokenMint,
          wallet: seller.publicKey,
        },
        {}
      );
      await sendTransactionWithWallet(connection, tx, seller);

      // Check that token account delegate is no longer program as signer
      await verifyDelegateAndFrozen(
        connection,
        tokenMint,
        tokenAccount,
        seller,
        programCreator.programId,
        false
      );
      const nftTxs = await getNftTxs(
        connection,
        tokenMint,
        1000,
        "afterCancel.json"
      );
      const cancelTx = nftTxs[0];
      expect(cancelTx.fromAddress).toEqual(seller.publicKey.toString());
      expect(cancelTx.toAddress).toEqual(seller.publicKey.toString());
      expect(cancelTx.type).toEqual(NftTransactionType.ListingCancelled);
    } catch (e) {
      logIfDebug("error cancelling", e);
      throw e;
    }

    // After cancelling, sell again
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE
    );
  });

  it("verify that cancelling an offer does not thaw", async () => {
    await buy(
      connection,
      auctionHouseSdk,
      BUY_PRICE,
      tokenMint,
      tokenAccount,
      buyer,
      buyer.publicKey,
      SaleType.Offer
    );

    const cancelTx = await auctionHouseSdk.cancelTx(
      {
        priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
        tokenAccount,
        tokenMint,
        wallet: buyer.publicKey,
      },
      {}
    );
    await sendTransactionWithWallet(connection, cancelTx, WALLET_CREATOR);

    const [programAsSigner] = await auctionHouseSdk.findProgramAsSigner();
    await verifyDelegateAndFrozen(
      connection,
      tokenMint,
      tokenAccount,
      seller,
      auctionHouseSdk.program.programId,
      true,
      programAsSigner
    );
  });
});
