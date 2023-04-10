import { getTokenAmount } from "@formfunction-hq/formfunction-program-shared";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getEditionDistributorSetup from "tests/utils/getEditionDistributorSetup";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import PriceFunctionType from "types/enum/PriceFunctionType";

const connection = getConnectionForTest();

describe("close edition distributor token account tests", () => {
  it("close successfully", async () => {
    const { auctionHouseSdk, nftOwner, nftOwnerTokenAccount, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const rentReceiver = Keypair.generate().publicKey;

    const tokenReceiverAmountBefore = await getTokenAmount(
      connection,
      nftOwnerTokenAccount
    );
    const rentReceiverAccountBefore = await connection.getAccountInfo(
      rentReceiver
    );
    expect(tokenReceiverAmountBefore).toEqual(0);
    expect(rentReceiverAccountBefore).toBeNull();

    const tx = await auctionHouseSdk.closeEditionDistributorTokenAccount({
      mint: tokenMint,
      owner: nftOwner.publicKey,
      rentReceiver: rentReceiver,
      tokenReceiver: nftOwnerTokenAccount,
      wallet: nftOwner.publicKey,
    });
    await sendTransactionWithWallet(connection, tx, nftOwner);

    const tokenReceiverAmountAfter = await getTokenAmount(
      connection,
      nftOwnerTokenAccount
    );
    const rentReceiverAccountAfter = await connection.getAccountInfo(
      rentReceiver
    );
    expect(tokenReceiverAmountAfter).toEqual(1);
    expect(rentReceiverAccountAfter!.lamports).toBeGreaterThan(0);
  });
});
