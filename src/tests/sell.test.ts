import { transfer } from "@formfunction-hq/formfunction-program-shared";
import { Keypair, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
  BUY_PRICE,
} from "tests/constants/AuctionHouse";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import NftTransactionType from "tests/types/enums/NftTransactionType";
import expectFunctionToFailWithErrorCode from "tests/utils/errors/expectFunctionToFailWithErrorCode";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getProgram from "tests/utils/getProgram";
import getTestSetup from "tests/utils/getTestSetup";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import sell from "tests/utils/sell";
import getNftTxs from "tests/utils/txs/getNftTxs";

let tokenMint: PublicKey;
let tokenAccount: PublicKey;
let buyerTokenAccount: PublicKey;
let auctionHouseSdk: AuctionHouseSdk;
let sellers: Array<Keypair>;
let _buyers: Array<Keypair>;

let seller: Keypair;

const connection = getConnectionForTest();

// Use different wallet creator to isolate auction house from other tests
const programCreator = getProgram(WALLET_CREATOR);

describe("sell tests", () => {
  beforeAll(async () => {
    [
      auctionHouseSdk,
      buyerTokenAccount,
      tokenAccount,
      tokenMint,
      sellers,
      _buyers,
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
  });

  it("sell", async () => {
    await sell(
      connection,
      auctionHouseSdk,
      tokenMint,
      tokenAccount,
      seller,
      BUY_PRICE
    );

    await expectFunctionToFailWithErrorCode({
      errorName: "Account is frozen",
      fn: () =>
        transfer(
          connection,
          seller,
          tokenAccount,
          tokenMint,
          buyerTokenAccount
        ),
    });

    const nftTxs = await getNftTxs(
      connection,
      tokenMint,
      1000,
      "afterSell.json"
    );
    const sellTx = nftTxs[0];
    expect(sellTx.fromAddress).toEqual(seller.publicKey.toString());
    expect(sellTx.toAddress).toEqual(seller.publicKey.toString());
    expect(sellTx.type).toEqual(NftTransactionType.Listed);
  });
});
