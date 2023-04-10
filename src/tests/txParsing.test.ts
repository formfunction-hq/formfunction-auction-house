import {
  createAtaIfNotExists,
  createAtaIx,
  createNftMint,
  findAtaPda,
  getTokenAmount,
  logIfDebug,
  mintTo,
  requestAirdrops,
} from "@formfunction-hq/formfunction-program-shared";
import {
  createTransferCheckedInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import { sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { WALLET_BUYER, WALLET_SELLER } from "tests/constants/Wallets";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getNftTxs from "tests/utils/txs/getNftTxs";

async function setup() {
  //
  // Create mint account
  //
  logIfDebug("creating token mint");
  const tokenMint = await createNftMint(connection, WALLET_SELLER);
  logIfDebug(`token mint created at ${tokenMint.toString()}`);

  //
  // Create ATA
  //
  const tokenAccountSeller = await createAtaIfNotExists(
    connection,
    WALLET_SELLER.publicKey,
    tokenMint,
    WALLET_SELLER,
    "seller"
  );

  //
  // Mint token to ATA
  //
  const tokenAmount = await getTokenAmount(connection, tokenAccountSeller);
  if (tokenAmount === 0) {
    logIfDebug(`minting one token to ${tokenAccountSeller.toString()}`);
    await mintTo(
      connection,
      tokenMint,
      tokenAccountSeller,
      WALLET_SELLER.publicKey,
      [WALLET_SELLER],
      1
    );
  }

  return { tokenAccountSeller, tokenMint };
}

const connection = getConnectionForTest();

describe("tx parsing tests", () => {
  beforeAll(async () => {
    await requestAirdrops({
      connection,
      wallets: [WALLET_BUYER, WALLET_SELLER],
    });
  });

  it.skip("standalone transfer checked ix", async () => {
    const { tokenMint, tokenAccountSeller } = await setup();
    const tokenAccountBuyer = await createAtaIfNotExists(
      connection,
      WALLET_BUYER.publicKey,
      tokenMint,
      WALLET_BUYER,
      "buyer"
    );

    //
    // Transfer token
    //
    // NOTE: cannot use tokenMintObj.transfer, otherwise transfer tx will not
    // be included in getConfirmedSignaturesForAddress2. Must use "transfer checked" (it's
    // what Phantom uses).
    //
    logIfDebug("transferring 1 token from seller to buyer");
    const transferCheckedIx = createTransferCheckedInstruction(
      tokenAccountSeller,
      tokenMint,
      tokenAccountBuyer,
      WALLET_SELLER.publicKey,
      1,
      0,
      [WALLET_SELLER]
    );
    const tx = new Transaction();
    tx.add(transferCheckedIx);
    await sendAndConfirmTransaction(connection, tx, [WALLET_SELLER]);

    const nftTxs = await getNftTxs(connection, tokenMint, 1000, "txs1.json");
    logIfDebug("nftTxs", nftTxs);
  });

  it("transfer + create ATA", async () => {
    const { tokenMint, tokenAccountSeller } = await setup();

    const [tokenAccountBuyer] = findAtaPda(WALLET_BUYER.publicKey, tokenMint);
    const ataIx = await createAtaIx(
      tokenMint,
      WALLET_BUYER.publicKey,
      WALLET_BUYER.publicKey
    );

    const transferIx = createTransferInstruction(
      tokenAccountSeller,
      tokenAccountBuyer,
      WALLET_SELLER.publicKey,
      1,
      [WALLET_SELLER]
    );
    const tx = new Transaction();
    tx.add(ataIx, transferIx);
    logIfDebug("creating ATA, and transferring 1 token from seller to buyer");
    await sendAndConfirmTransaction(connection, tx, [
      WALLET_BUYER,
      WALLET_SELLER,
    ]);

    const nftTxs = await getNftTxs(connection, tokenMint, 1000, "txs2.json");
    logIfDebug("nftTxs", nftTxs);
  });
});
