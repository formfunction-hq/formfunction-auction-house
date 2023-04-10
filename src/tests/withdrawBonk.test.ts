import {
  createAtaIfNotExists,
  mintTo,
  requestAirdrops,
} from "@formfunction-hq/formfunction-program-shared";
import { createMint } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getEditionDistributorSetup from "tests/utils/getEditionDistributorSetup";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import PriceFunctionType from "types/enum/PriceFunctionType";

const payer = Keypair.generate();
const connection = getConnectionForTest();

describe("withdraw bonk", () => {
  beforeAll(async () => {
    await requestAirdrops({
      connection,
      wallets: [payer],
    });
  });

  it("withdraw bonk", async () => {
    const price = LAMPORTS_PER_SOL;
    const { auctionHouseSdk, editionDistributor, programCreator, tokenMint } =
      await getEditionDistributorSetup({
        multipleCreators: true,
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: price,
      });

    // We'll pretend this is the Bonk token mint
    const token = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      0
    );

    // Create ATAs for the edition distributor and payer
    const editionDistributorAta = await createAtaIfNotExists(
      connection,
      editionDistributor,
      token,
      payer
    );
    const payerAta = await createAtaIfNotExists(
      connection,
      payer.publicKey,
      token,
      payer
    );

    // Mint some Bonk tokens to the edition distributor
    await mintTo(
      connection,
      token,
      editionDistributorAta,
      payer.publicKey,
      [payer],
      10
    );

    // Check balances before the Bonk withdrawal happens
    const editionDistributorBalance = await connection.getTokenAccountBalance(
      editionDistributorAta,
      "processed"
    );
    const payerBalance = await connection.getTokenAccountBalance(
      payerAta,
      "processed"
    );
    expect(Number(editionDistributorBalance.value.amount)).toBe(10);
    expect(Number(payerBalance.value.amount)).toBe(0);

    // Withdraw the Bonk!
    const tx = await auctionHouseSdk.withdrawBonkTx({
      bonkTokenAccount: editionDistributorAta,
      mint: tokenMint,
      tokenReceiver: payerAta,
    });
    await sendTransactionWithWallet(connection, tx, programCreator);

    // Check balances after the Bonk withdrawal happens
    const editionDistributorBalanceAfter =
      await connection.getTokenAccountBalance(
        editionDistributorAta,
        "processed"
      );
    const payerBalanceAfter = await connection.getTokenAccountBalance(
      payerAta,
      "processed"
    );
    expect(Number(editionDistributorBalanceAfter.value.amount)).toBe(0);
    expect(Number(payerBalanceAfter.value.amount)).toBe(10);
  });
});
