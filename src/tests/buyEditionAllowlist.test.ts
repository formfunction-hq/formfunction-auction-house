import {
  arePublicKeysEqual,
  forEachAsync,
  generateKeypairArray,
  logIfDebug,
  Maybe,
  randomNumberInRange,
  range,
  requestAirdrops,
  sleep,
} from "@formfunction-hq/formfunction-program-shared";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import dayjs from "dayjs";
import buyEditionForTest from "tests/utils/buyEditionForTest";
import createEditionAllowlist from "tests/utils/createEditionAllowlist";
import createKeypairAddressMap from "tests/utils/createKeypairAddressMap";
import expectFunctionToFailWithErrorCode from "tests/utils/errors/expectFunctionToFailWithErrorCode";
import fundSplTokenAtas from "tests/utils/fundSplTokenAccount";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getEditionDistributorSetup from "tests/utils/getEditionDistributorSetup";
import PriceFunctionType from "types/enum/PriceFunctionType";
import MerkleAllowlistBuyersList from "types/merkle-tree/MerkleAllowlistBuyersList";
import MerkleAllowlistBuyerWithProof from "types/merkle-tree/MerkleAllowlistBuyerWithProof";

const connection = getConnectionForTest();

const buyers = generateKeypairArray(5);

const buyersKeypairMap = createKeypairAddressMap(buyers);

// Note: We wait for this time in the test after minting from the allowlist.
// If the number of buyers changes (or if the tests start failing for other
// reasons), this time may need to be adjusted.
function getPublicSaleStartTimeForTest() {
  return dayjs().add(20, "seconds").unix();
}

// Recursively get a proof randomly from another buyer, which should be
// invalid, for the currentBuyer.
function getOtherBuyersProof(
  buyersList: Array<MerkleAllowlistBuyersList>,
  currentBuyer: PublicKey
): MerkleAllowlistBuyerWithProof {
  const randomChunkIndex = randomNumberInRange(0, buyersList.length - 1);
  const { buyersChunk } = buyersList[randomChunkIndex];
  const randomBuyerIndex = randomNumberInRange(0, buyersChunk.length - 1);
  const randomBuyer = buyersChunk[randomBuyerIndex];

  if (arePublicKeysEqual(randomBuyer.address, currentBuyer)) {
    return getOtherBuyersProof(buyersList, currentBuyer);
  }

  return randomBuyer;
}

async function waitForPublicSale(publicSaleStartTime: number): Promise<void> {
  const now = dayjs().unix();
  const remainingTimeUntilPublicSale =
    now < publicSaleStartTime ? publicSaleStartTime - now : 0;
  const extraBufferTime = 2; // This is a bit arbitrary.
  const timeToWait = remainingTimeUntilPublicSale + extraBufferTime;
  logIfDebug(`Waiting ${timeToWait} seconds for public sale to start.`);
  await sleep(timeToWait);
}

describe("buy edition v2 allowlist", () => {
  beforeAll(async () => {
    await requestAirdrops({
      connection,
      wallets: buyers,
    });
    await fundSplTokenAtas(connection, buyers);
  });

  test("buy edition with an allowlist", async () => {
    const price = LAMPORTS_PER_SOL;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      programCreator,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      allowlistSaleStartTime: dayjs().unix(),
      antiBotProtectionEnabled: false,
      maxSupply: 500,
      multipleCreators: false,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      publicSaleStartTime: 0,
      startingPriceLamports: price,
    });

    const allowlistedBuyers = await createEditionAllowlist({
      auctionHouseAuthorityKeypair: programCreator,
      auctionHouseSdk,
      buyers,
      connection,
      mint: tokenMint,
    });

    await forEachAsync(allowlistedBuyers, async (allowlistSection, index) => {
      await forEachAsync(allowlistSection.buyersChunk, async (proofData) => {
        const buyerKeypair = buyersKeypairMap[proofData.address.toString()];

        const handleBuy = async (
          buyerWithAllowlistProofData: Maybe<MerkleAllowlistBuyerWithProof>
        ) => {
          await buyEditionForTest({
            auctionHouseAccount,
            auctionHouseSdk,
            buyerKeypair,
            buyerWithAllowlistProofData,
            connection,
            metadataData,
            nftOwner,
            price,
            proofTreeIndex: index,
            remainingAccounts,
            tokenMint,
          });
        };

        // A proof is required, because this is an allowlist sale.
        await expectFunctionToFailWithErrorCode({
          errorName: "AllowlistProofRequired",
          fn: () => handleBuy(null),
        });

        // Invalid proofs are rejected.
        const randomInvalidProofData = getOtherBuyersProof(
          allowlistedBuyers,
          proofData.address
        );
        await expectFunctionToFailWithErrorCode({
          errorName: "InvalidAllowlistProof",
          fn: () => handleBuy(randomInvalidProofData),
        });

        // Valid proofs are accepted, up to the allowlisted amount.
        await forEachAsync(range(0, proofData.amount), async () => {
          await handleBuy(proofData);
        });

        // Minting past the allowlisted amount fails.
        await expectFunctionToFailWithErrorCode({
          errorName: "AllowlistAmountAlreadyMinted",
          fn: () => handleBuy(proofData),
        });
      });
    });
  });

  test("buy edition with an allowlist before the allowlist start time fails", async () => {
    const price = LAMPORTS_PER_SOL;
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      programCreator,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      allowlistSaleStartTime: dayjs().add(1, "day").unix(),
      antiBotProtectionEnabled: false,
      multipleCreators: false,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      publicSaleStartTime: 0,
      startingPriceLamports: price,
    });

    const allowlistedBuyers = await createEditionAllowlist({
      auctionHouseAuthorityKeypair: programCreator,
      auctionHouseSdk,
      buyers,
      connection,
      mint: tokenMint,
    });

    await forEachAsync(allowlistedBuyers, async (allowlistSection, index) => {
      await forEachAsync(allowlistSection.buyersChunk, async (proofData) => {
        const buyerKeypair = buyersKeypairMap[proofData.address.toString()];

        const handleBuy = async (
          buyerWithAllowlistProofData: Maybe<MerkleAllowlistBuyerWithProof>
        ) => {
          await buyEditionForTest({
            auctionHouseAccount,
            auctionHouseSdk,
            buyerKeypair,
            buyerWithAllowlistProofData,
            connection,
            metadataData,
            nftOwner,
            price,
            proofTreeIndex: index,
            remainingAccounts,
            tokenMint,
          });
        };

        // Allowlist sale hasn't started yet so buying attempts should fail.
        await expectFunctionToFailWithErrorCode({
          errorName: "BuyEditionTooEarly",
          fn: () => handleBuy(proofData),
        });
      });
    });
  });

  test("buy edition with an allowlist can be followed by a public sale with buy limits", async () => {
    const price = LAMPORTS_PER_SOL;
    const limitPerAddress = 3;
    const publicSaleStartTime = getPublicSaleStartTimeForTest();
    const {
      auctionHouseAccount,
      auctionHouseSdk,
      metadataData,
      nftOwner,
      programCreator,
      remainingAccounts,
      tokenMint,
    } = await getEditionDistributorSetup({
      allowlistSaleStartTime: dayjs().unix(),
      antiBotProtectionEnabled: false,
      limitPerAddress,
      maxSupply: 500,
      multipleCreators: false,
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      publicSaleStartTime,
      startingPriceLamports: price,
    });

    const allowlistedBuyers = await createEditionAllowlist({
      auctionHouseAuthorityKeypair: programCreator,
      auctionHouseSdk,
      buyers,
      connection,
      mint: tokenMint,
    });

    const handleBuy = async (
      buyerKeypair: Keypair,
      buyerWithAllowlistProofData: Maybe<MerkleAllowlistBuyerWithProof>,
      proofTreeIndex: Maybe<number>
    ) => {
      await buyEditionForTest({
        auctionHouseAccount,
        auctionHouseSdk,
        buyerKeypair,
        buyerWithAllowlistProofData,
        connection,
        metadataData,
        nftOwner,
        price,
        proofTreeIndex,
        remainingAccounts,
        tokenMint,
      });
    };

    await forEachAsync(allowlistedBuyers, async (allowlistSection, index) => {
      await forEachAsync(allowlistSection.buyersChunk, async (proofData) => {
        const buyerKeypair = buyersKeypairMap[proofData.address.toString()];

        // Mint all the allowlisted editions for each buyer.
        await forEachAsync(range(0, proofData.amount), async () => {
          await handleBuy(buyerKeypair, proofData, index);
        });
      });
    });

    await waitForPublicSale(publicSaleStartTime);

    await forEachAsync(buyers, async (buyer) => {
      // Buy up to the limit per address for each buyer.
      await forEachAsync(range(0, limitPerAddress), async () => {
        await handleBuy(buyer, null, null);
      });

      // Additional buys should fail.
      await expectFunctionToFailWithErrorCode({
        errorName: "EditionLimitPerAddressExceeded",
        fn: () => handleBuy(buyer, null, null),
      });
    });
  });

  test("buy edition with an allowlist can be priced separately from the public sale, and can be priced at 0", async () => {
    const ALLOWLIST_PRICES = [0, LAMPORTS_PER_SOL / 2];

    for (const allowlistSalePrice of ALLOWLIST_PRICES) {
      const publicSalePrice = LAMPORTS_PER_SOL;
      const limitPerAddress = 3;
      const publicSaleStartTime = getPublicSaleStartTimeForTest();
      const {
        auctionHouseAccount,
        auctionHouseSdk,
        metadataData,
        nftOwner,
        programCreator,
        remainingAccounts,
        tokenMint,
      } = await getEditionDistributorSetup({
        allowlistSalePrice,
        allowlistSaleStartTime: dayjs().unix(),
        antiBotProtectionEnabled: false,
        limitPerAddress,
        maxSupply: 500,
        multipleCreators: false,
        priceFunctionType: PriceFunctionType.Constant,
        priceParams: [],
        publicSaleStartTime,
        startingPriceLamports: publicSalePrice,
      });

      const allowlistedBuyers = await createEditionAllowlist({
        auctionHouseAuthorityKeypair: programCreator,
        auctionHouseSdk,
        buyers,
        connection,
        mint: tokenMint,
      });

      const handleBuy = async (
        buyerKeypair: Keypair,
        buyerWithAllowlistProofData: Maybe<MerkleAllowlistBuyerWithProof>,
        price: number,
        proofTreeIndex: Maybe<number>
      ) => {
        await buyEditionForTest({
          auctionHouseAccount,
          auctionHouseSdk,
          buyerKeypair,
          buyerWithAllowlistProofData,
          connection,
          metadataData,
          nftOwner,
          price,
          proofTreeIndex,
          remainingAccounts,
          tokenMint,
        });
      };

      await forEachAsync(allowlistedBuyers, async (allowlistSection, index) => {
        await forEachAsync(allowlistSection.buyersChunk, async (proofData) => {
          const buyerKeypair = buyersKeypairMap[proofData.address.toString()];
          await handleBuy(buyerKeypair, proofData, allowlistSalePrice, index);
        });
      });

      await waitForPublicSale(publicSaleStartTime);

      await forEachAsync(buyers, async (buyer) => {
        await handleBuy(buyer, null, publicSalePrice, null);
      });
    }
  });
});
