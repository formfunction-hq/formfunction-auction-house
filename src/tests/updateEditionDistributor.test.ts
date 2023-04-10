import {
  expectPublicKeysEqual,
  requestAirdrops,
} from "@formfunction-hq/formfunction-program-shared";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import dayjs from "dayjs";
import expectTransactionToFailWithErrorCode from "tests/utils/errors/expectTransactionToFailWithErrorCode";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getEditionDistributorPriceFunction from "tests/utils/getEditionDistributorPriceFunction";
import getEditionDistributorSetup from "tests/utils/getEditionDistributorSetup";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import PriceFunctionType from "types/enum/PriceFunctionType";

const connection = getConnectionForTest();

describe("update edition distributor tests", () => {
  it("invalid signer", async () => {
    const invalidSigner = Keypair.generate();
    const { auctionHouseSdk, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const newPrice = LAMPORTS_PER_SOL * 2;
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        publicSaleStartTime: null,
        saleEndTime: null,
        startingPriceLamports: newPrice,
      }
    );
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "SignatureVerificationFailed",
      signers: [invalidSigner],
      transaction: updateTx,
    });
  });

  it("update starting price", async () => {
    const priceFunctionType = PriceFunctionType.Constant;
    const priceParams: Array<number> = [];
    const { auctionHouseSdk, editionDistributor, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: priceFunctionType,
        priceParams: priceParams,
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const newPrice = LAMPORTS_PER_SOL * 2;
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        publicSaleStartTime: null,
        saleEndTime: null,
        startingPriceLamports: newPrice,
      }
    );
    await sendTransactionWithWallet(
      auctionHouseSdk.program.provider.connection,
      updateTx,
      nftOwner
    );

    const priceFunction = await getEditionDistributorPriceFunction(
      auctionHouseSdk.program,
      editionDistributor
    );
    expect(priceFunction.startingPriceLamports).toEqual(newPrice);

    // Other fields shouldn't change
    expect(priceFunction.params).toEqual(priceParams);
    expect(priceFunction.priceFunctionType).toEqual(priceFunctionType);
  });

  it("update entire price function", async () => {
    const { auctionHouseSdk, editionDistributor, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const newPrice = LAMPORTS_PER_SOL * 2;
    const newPriceFunctionType = PriceFunctionType.Linear;
    const newParams = [5];
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        priceFunctionType: newPriceFunctionType,
        priceParams: newParams,
        publicSaleStartTime: null,
        saleEndTime: null,
        startingPriceLamports: newPrice,
      }
    );
    await sendTransactionWithWallet(
      auctionHouseSdk.program.provider.connection,
      updateTx,
      nftOwner
    );

    const priceFunction = await getEditionDistributorPriceFunction(
      auctionHouseSdk.program,
      editionDistributor
    );
    expect(priceFunction.priceFunctionType).toEqual(newPriceFunctionType);
    expect(priceFunction.params).toEqual(newParams);
    expect(priceFunction.startingPriceLamports).toEqual(newPrice);
  });

  it("update the owner", async () => {
    const { auctionHouseSdk, editionDistributor, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const newOwnerKeypair = Keypair.generate();
    const newOwner = newOwnerKeypair.publicKey;
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        newOwner,
        publicSaleStartTime: null,
        saleEndTime: null,
      }
    );
    await sendTransactionWithWallet(
      auctionHouseSdk.program.provider.connection,
      updateTx,
      nftOwner
    );

    const editionDistributorUpdated =
      await auctionHouseSdk.program.account.editionDistributor.fetch(
        editionDistributor
      );
    expectPublicKeysEqual(editionDistributorUpdated.owner, newOwner);

    // Trying to update with the old owner should fail
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "ConstraintHasOne",
      signers: [nftOwner],
      transaction: updateTx,
    });

    // Make sure the new owner is able to update the distributor
    await requestAirdrops({ connection, wallets: [newOwnerKeypair] });
    const updateTx2 = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: newOwner,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        newOwner: nftOwner.publicKey,
        publicSaleStartTime: null,
        saleEndTime: null,
      }
    );
    await expect(
      sendTransactionWithWallet(
        auctionHouseSdk.program.provider.connection,
        updateTx2,
        newOwnerKeypair
      )
    ).resolves.not.toThrow();
  });

  it("update start time (valid)", async () => {
    const { auctionHouseSdk, editionDistributor, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const startTime = dayjs().add(1, "day").unix();
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        publicSaleStartTime: startTime,
        saleEndTime: null,
      }
    );
    await sendTransactionWithWallet(
      auctionHouseSdk.program.provider.connection,
      updateTx,
      nftOwner
    );

    const editionDistributorAccount =
      await auctionHouseSdk.program.account.editionDistributor.fetch(
        editionDistributor
      );

    expect(editionDistributorAccount.publicSaleStartTime!.toNumber()).toEqual(
      startTime
    );
  });

  it("update end time (valid)", async () => {
    const { auctionHouseSdk, editionDistributor, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const endTime = dayjs().add(1, "day").unix();
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        publicSaleStartTime: null,
        saleEndTime: endTime,
      }
    );
    await sendTransactionWithWallet(
      auctionHouseSdk.program.provider.connection,
      updateTx,
      nftOwner
    );

    const editionDistributorAccount =
      await auctionHouseSdk.program.account.editionDistributor.fetch(
        editionDistributor
      );

    expect(editionDistributorAccount.saleEndTime!.toNumber()).toEqual(endTime);
  });

  it("update end time (invalid)", async () => {
    const { auctionHouseSdk, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const endTime = dayjs().subtract(1, "day").unix();
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        publicSaleStartTime: null,
        saleEndTime: endTime,
      }
    );
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "EndTimeMustBeInFuture",
      signers: [nftOwner],
      transaction: updateTx,
    });
  });

  it("update start time and end time (valid)", async () => {
    const { auctionHouseSdk, editionDistributor, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const startTime = dayjs().add(1, "day").unix();
    const endTime = dayjs().add(2, "day").unix();
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        publicSaleStartTime: startTime,
        saleEndTime: endTime,
      }
    );
    await sendTransactionWithWallet(
      auctionHouseSdk.program.provider.connection,
      updateTx,
      nftOwner
    );

    const editionDistributorAccount =
      await auctionHouseSdk.program.account.editionDistributor.fetch(
        editionDistributor
      );

    expect(editionDistributorAccount.publicSaleStartTime!.toNumber()).toEqual(
      startTime
    );
    expect(editionDistributorAccount.saleEndTime!.toNumber()).toEqual(endTime);
  });

  it("update start time and end time (invalid)", async () => {
    const { auctionHouseSdk, nftOwner, tokenMint } =
      await getEditionDistributorSetup({
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: LAMPORTS_PER_SOL,
      });

    const startTime = dayjs().add(2, "day").unix();
    const endTime = dayjs().add(1, "day").unix();
    const updateTx = await auctionHouseSdk.updateEditionDistributorTx(
      {
        mint: tokenMint,
        owner: nftOwner.publicKey,
      },
      {
        allowlistSalePrice: null,
        allowlistSaleStartTime: null,
        publicSaleStartTime: startTime,
        saleEndTime: endTime,
      }
    );
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "EndTimeMustComeAfterStartTime",
      signers: [nftOwner],
      transaction: updateTx,
    });
  });
});
