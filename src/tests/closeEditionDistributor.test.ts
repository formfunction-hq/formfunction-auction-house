import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getEditionDistributorSetup from "tests/utils/getEditionDistributorSetup";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import PriceFunctionType from "types/enum/PriceFunctionType";

const connection = getConnectionForTest();

describe("close edition distributor tests", () => {
  it("close successfully", async () => {
    const { auctionHouseSdk, editionDistributor, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const rentReceiver = Keypair.generate().publicKey;
    const rentReceiverAccountBefore = await connection.getAccountInfo(
      rentReceiver
    );
    expect(rentReceiverAccountBefore).toBeNull();

    const tx = await auctionHouseSdk.closeEditionDistributor({
      mint: tokenMint,
      owner: nftOwner.publicKey,
      rentReceiver,
    });
    await sendTransactionWithWallet(connection, tx, nftOwner);

    const rentReceiverAccountAfter = await connection.getAccountInfo(
      rentReceiver
    );
    expect(rentReceiverAccountAfter!.lamports).toBeGreaterThan(0);
    const editionDistributorAccount = await connection.getAccountInfo(
      editionDistributor
    );
    expect(editionDistributorAccount).toBeNull();
  });
});
