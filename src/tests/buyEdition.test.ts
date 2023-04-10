import {
  ANTI_BOT_DEV_AUTHORITY_KEYPAIR,
  findAtaPda,
  findEditionPda,
  getTokenAccountInfo,
  requestAirdrops,
} from "@formfunction-hq/formfunction-program-shared";
import {
  Edition,
  MasterEditionV2,
} from "@metaplex-foundation/mpl-token-metadata";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import findEditionBuyerInfoAccountPda from "solana/pdas/findEditionBuyerInfoAccountPda";
import {
  BASIS_POINTS_100_PERCENT,
  BOT_TAX,
} from "tests/constants/AuctionHouse";
import { IS_NATIVE } from "tests/setup";
import buyEditionForTest from "tests/utils/buyEditionForTest";
import createAuctionHouseHelper from "tests/utils/createAuctionHouseHelper";
import expectFunctionToFailWithErrorCode from "tests/utils/errors/expectFunctionToFailWithErrorCode";
import expectSlightlyGreaterThan from "tests/utils/expectSlightlyGreaterThan";
import expectSlightlyLessThan from "tests/utils/expectSlightlyLessThan";
import fundSplTokenAtas from "tests/utils/fundSplTokenAccount";
import getBalance from "tests/utils/getBalance";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getEditionDistributorSetup from "tests/utils/getEditionDistributorSetup";
import getProgram from "tests/utils/getProgram";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import PriceFunctionType from "types/enum/PriceFunctionType";

const buyerKeypair = Keypair.generate();
const buyer2Keypair = Keypair.generate();

const connection = getConnectionForTest();

async function getEdition(mint: PublicKey): Promise<number> {
  const [edition] = findEditionPda(mint);
  const editionAccount = await Edition.fromAccountAddress(connection, edition);

  return typeof editionAccount.edition === "number"
    ? editionAccount.edition
    : editionAccount.edition.toNumber();
}

async function verifyEdition(
  mint: PublicKey,
  expectedEdition: number
): Promise<void> {
  const actualEdition = await getEdition(mint);
  expect(actualEdition).toEqual(expectedEdition);
}

describe("buy edition v2", () => {
  beforeAll(async () => {
    await requestAirdrops({
      connection,
      wallets: [buyerKeypair, buyer2Keypair],
    });
    await fundSplTokenAtas(connection, [buyerKeypair, buyer2Keypair]);
  });

  it.each(["single creator", "anti-botting"])(
    "buy edition (%s)",
    // @ts-ignore
    async (test: "single creator" | "anti-botting") => {
      const price = LAMPORTS_PER_SOL;
      const {
        auctionHouseAccount,
        auctionHouseSdk,
        metadataData,
        nftOwner,
        remainingAccounts,
        tokenMint,
      } = await getEditionDistributorSetup({
        antiBotProtectionEnabled: test === "anti-botting",
        multipleCreators: false,
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        startingPriceLamports: price,
      });

      const [
        buyerAccountBalanceBefore,
        creatorAccountBalanceBefore,
        treasuryAccountBalanceBefore,
      ] = await Promise.all([
        getBalance(connection, { wallet: buyerKeypair.publicKey }),
        getBalance(connection, { wallet: remainingAccounts[0].pubkey }),
        getBalance(connection, { account: auctionHouseSdk.treasuryAccount }),
      ]);

      const { newMintKeypair } = await buyEditionForTest({
        auctionHouseAccount,
        auctionHouseSdk,
        buyerKeypair,
        connection,
        metadataData,
        nftOwner,
        price,
        remainingAccounts,
        signers:
          test === "anti-botting" ? [ANTI_BOT_DEV_AUTHORITY_KEYPAIR] : [],
        tokenMint,
      });

      const [buyerAta] = findAtaPda(
        buyerKeypair.publicKey,
        newMintKeypair.publicKey
      );

      await verifyEdition(newMintKeypair.publicKey, 1);
      const [
        buyerAtaAccountAfter,
        buyerAccountBalanceAfter,
        creatorAccountBalanceAfter,
        treasuryAccountBalanceAfter,
      ] = await Promise.all([
        getTokenAccountInfo(connection, buyerAta),
        getBalance(connection, { wallet: buyerKeypair.publicKey }),
        getBalance(connection, { wallet: remainingAccounts[0].pubkey }),
        getBalance(connection, { account: auctionHouseSdk.treasuryAccount }),
      ]);

      const fees =
        (price * auctionHouseAccount.sellerFeeBasisPoints) /
        BASIS_POINTS_100_PERCENT;

      expectSlightlyGreaterThan(
        buyerAccountBalanceBefore - buyerAccountBalanceAfter,
        price,
        // For SPL token transactions, no fees are deducted from the balance
        // so we can check the exact amount
        IS_NATIVE ? undefined : 0
      );
      expect(creatorAccountBalanceAfter - creatorAccountBalanceBefore).toEqual(
        price - fees
      );
      expect(
        treasuryAccountBalanceAfter - treasuryAccountBalanceBefore
      ).toEqual(fees);
      expect(Number(buyerAtaAccountAfter.amount)).toEqual(1);
    }
  );

  it("buy edition (multiple creators)", async () => {
    const price = LAMPORTS_PER_SOL;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      multipleCreators: true,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: price,
    });

    const { newMintKeypair } = await buyEditionForTest({
      auctionHouseAccount,
      auctionHouseSdk,
      buyerKeypair,
      connection,
      metadataData,
      nftOwner,
      price,
      remainingAccounts,
      tokenMint,
    });

    await verifyEdition(newMintKeypair.publicKey, 1);
  });

  it("multiple buyers", async () => {
    const price = LAMPORTS_PER_SOL;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: price,
    });

    // First buy
    const { newMintKeypair: newMint1Keypair } = await buyEditionForTest({
      auctionHouseAccount,
      auctionHouseSdk,
      buyerKeypair,
      connection,
      metadataData,
      nftOwner,
      price,
      remainingAccounts,
      tokenMint,
    });
    await verifyEdition(newMint1Keypair.publicKey, 1);

    // Second buy (same buyer as first buy)
    const { newMintKeypair: newMint2Keypair } = await buyEditionForTest({
      auctionHouseAccount,
      auctionHouseSdk,
      buyerKeypair,
      connection,
      metadataData,
      nftOwner,
      price,
      remainingAccounts,
      tokenMint,
    });
    await verifyEdition(newMint2Keypair.publicKey, 2);

    // Third buy (different buyer)
    const { newMintKeypair: newMint3Keypair } = await buyEditionForTest({
      auctionHouseAccount,
      auctionHouseSdk,
      buyerKeypair: buyer2Keypair,
      connection,
      metadataData,
      nftOwner,
      price,
      remainingAccounts,
      tokenMint,
    });
    await verifyEdition(newMint3Keypair.publicKey, 3);
  });

  it("try buying when no more supply", async () => {
    const price = LAMPORTS_PER_SOL;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      maxSupply: 1,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: price,
    });

    // First buy should succeed
    const { newMintKeypair: newMint1Keypair } = await buyEditionForTest({
      auctionHouseAccount,
      auctionHouseSdk,
      buyerKeypair: buyer2Keypair,
      connection,
      metadataData,
      nftOwner,
      price,
      remainingAccounts,
      tokenMint,
    });
    await verifyEdition(newMint1Keypair.publicKey, 1);

    // Second buy should fail, since supply is only 1
    await expectFunctionToFailWithErrorCode({
      errorName: "Edition Number greater than max supply",
      fn: () =>
        buyEditionForTest({
          auctionHouseAccount,
          auctionHouseSdk,
          buyerKeypair: buyer2Keypair,
          connection,
          metadataData,
          nftOwner,
          price,
          remainingAccounts,
          tokenMint,
        }),
    });
  });

  it("concurrent purchases", async () => {
    const price = LAMPORTS_PER_SOL;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      maxSupply: 3,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: price,
    });

    const buy = async () => {
      return buyEditionForTest({
        auctionHouseAccount,
        auctionHouseSdk,
        buyerKeypair,
        connection,
        metadataData,
        nftOwner,
        price,
        remainingAccounts,
        tokenMint,
      });
    };

    // Needs to be sequential for correct balance change assessment.
    const txResults = [await buy(), await buy(), await buy()];

    const editions = await Promise.all(
      txResults
        .map((result) => result.newMintKeypair)
        .map((kp) => getEdition(kp.publicKey))
    );
    expect(editions.sort()).toEqual([1, 2, 3]);

    const txs = await Promise.all(
      txResults
        .map((result) => result.txid)
        .map((txid) =>
          connection.getParsedTransaction(txid, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          })
        )
    );
    const editionNumbersFromTxs = await Promise.all(
      txs.map((tx) => AuctionHouseSdk.getEditionNumberFromTx(tx!))
    );
    expect(editionNumbersFromTxs.sort()).toEqual([1, 2, 3]);
  });

  it("buy edition properly imposes bot taxes if wrong antiBotAuthority is used", async () => {
    const price = LAMPORTS_PER_SOL;
    const intentionallyIncorrectAntiBotAuthority = Keypair.generate();
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      antiBotAuthority: intentionallyIncorrectAntiBotAuthority.publicKey,
      antiBotProtectionEnabled: true,
      multipleCreators: false,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: price,
    });

    const buyerAccountBefore = (await connection.getAccountInfo(
      buyerKeypair.publicKey
    ))!;
    const treasuryAccountBefore = (await connection.getAccountInfo(
      auctionHouseSdk.treasuryAccount
    ))!;

    const { txid } = await buyEditionForTest({
      auctionHouseAccount,
      auctionHouseSdk,
      buyerKeypair,
      connection,
      metadataData,
      nftOwner,
      price,
      remainingAccounts,
      sendOptions: { skipPreflight: true },
      signers: [intentionallyIncorrectAntiBotAuthority],
      tokenMint,
    });

    const result = await connection.getParsedTransaction(txid, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    expect(
      result?.meta?.logMessages?.some(
        (log) => log.includes("BotTaxCollected") && log.includes("6053")
      )
    ).toEqual(true);

    const [editionPda] = findEditionPda(tokenMint);

    const editionAfter = await MasterEditionV2.fromAccountAddress(
      connection,
      editionPda
    );

    const buyerAccountAfter = (await connection.getAccountInfo(
      buyerKeypair.publicKey
    ))!;
    const treasuryAccountAfter = (await connection.getAccountInfo(
      auctionHouseSdk.treasuryAccount
    ))!;

    // No editions should have been printed.
    expect(
      typeof editionAfter.supply === "number"
        ? editionAfter.supply
        : editionAfter.supply.toNumber()
    ).toEqual(0);

    // Buyer wallet lamports should be less than the original balance minus the bot fee.
    expectSlightlyLessThan(
      buyerAccountAfter.lamports,
      buyerAccountBefore.lamports - BOT_TAX
    );

    // Bot fee should have been credited to the auction house treasury.
    expect(treasuryAccountBefore.lamports + BOT_TAX).toEqual(
      treasuryAccountAfter.lamports
    );
  });

  it("enforces limit per address correctly", async () => {
    const price = LAMPORTS_PER_SOL;
    const limitPerAddress = 2;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      limitPerAddress,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: price,
    });

    for (let i = 0; i <= limitPerAddress; i++) {
      if (i < limitPerAddress) {
        const { newMintKeypair } = await buyEditionForTest({
          auctionHouseAccount,
          auctionHouseSdk,
          buyerKeypair,
          connection,
          metadataData,
          nftOwner,
          price,
          remainingAccounts,
          tokenMint,
        });
        await verifyEdition(newMintKeypair.publicKey, i + 1);
        continue;
      }

      await expectFunctionToFailWithErrorCode({
        errorName: "EditionLimitPerAddressExceeded",
        fn: () =>
          buyEditionForTest({
            auctionHouseAccount,
            auctionHouseSdk,
            buyerKeypair,
            connection,
            metadataData,
            nftOwner,
            price,
            remainingAccounts,
            sendOptions: { skipPreflight: true },
            tokenMint,
          }),
      });
    }
  });

  it("handles cases where the EditionBuyerInfoAccount already exists", async () => {
    const price = LAMPORTS_PER_SOL;
    const limitPerAddress = 2;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      limitPerAddress,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: price,
    });

    const [editionBuyerInfoAccount] = findEditionBuyerInfoAccountPda(
      tokenMint,
      buyerKeypair.publicKey,
      auctionHouseSdk.program.programId
    );

    // Fund the PDA account, which will create it, before buying the editions
    // to ensure the program handles this edge case correctly. See:
    // https://github.com/solana-labs/solana-program-library/blob/master/governance/tools/src/account.rs#L145
    await requestAirdrops({ connection, wallets: [editionBuyerInfoAccount] });

    for (let i = 0; i < limitPerAddress; i++) {
      const { newMintKeypair } = await buyEditionForTest({
        auctionHouseAccount,
        auctionHouseSdk,
        buyerKeypair,
        connection,
        metadataData,
        nftOwner,
        price,
        remainingAccounts,
        tokenMint,
      });
      await verifyEdition(newMintKeypair.publicKey, i + 1);
    }
  });

  it("mismatched treasury mint throws error", async () => {
    const price = LAMPORTS_PER_SOL;
    const {
      auctionHouseAccount,
      metadataData,
      nftOwner,
      programCreator,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: price,
    });

    const program = getProgram(programCreator);

    // Create other auction house so we can test trying to call
    // buy_edition_v2 with the wrong SDK
    await createAuctionHouseHelper(
      connection,
      program,
      programCreator,
      !IS_NATIVE
    );
    const auctionHouseSdk = AuctionHouseSdk.init(program, {
      antiBotAuthority: ANTI_BOT_DEV_AUTHORITY_KEYPAIR.publicKey,
      treasuryMint: await getTreasuryMint(!IS_NATIVE),
      walletAuthority: programCreator.publicKey,
      walletCreator: programCreator.publicKey,
    });

    await expectFunctionToFailWithErrorCode({
      errorName: "InvalidTreasuryMintForBuyEdition",
      fn: () =>
        buyEditionForTest({
          auctionHouseAccount,
          auctionHouseSdk,
          buyerKeypair,
          connection,
          metadataData,
          nftOwner,
          price,
          remainingAccounts,
          tokenMint,
        }),
    });
  });

  it("minimum price function type", async () => {
    const price = LAMPORTS_PER_SOL;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      priceFunctionType: PriceFunctionType.Minimum,
      priceParams: [],
      startingPriceLamports: price,
    });

    // First iteration buys at the price.
    // Second iteration buys at double the price.
    for (let i = 0; i < 2; i++) {
      const { newMintKeypair } = await buyEditionForTest({
        auctionHouseAccount,
        auctionHouseSdk,
        buyerKeypair,
        connection,
        metadataData,
        nftOwner,
        price,
        remainingAccounts,
        tokenMint,
      });
      await verifyEdition(newMintKeypair.publicKey, i + 1);
    }
  });
});
