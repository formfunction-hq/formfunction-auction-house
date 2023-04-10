import {
  forEachAsync,
  generateKeypairArray,
  range,
  requestAirdrops,
} from "@formfunction-hq/formfunction-program-shared";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import MERKLE_TREE_LEAF_COUNT_LIMIT from "constants/MerkleTreeLeafCountLimit";
import dayjs from "dayjs";
import buyEditionForTest from "tests/utils/buyEditionForTest";
import cloneKeypair from "tests/utils/cloneKeypair";
import createEditionAllowlist from "tests/utils/createEditionAllowlist";
import createKeypairAddressMap from "tests/utils/createKeypairAddressMap";
import fundSplTokenAtas from "tests/utils/fundSplTokenAccount";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getEditionDistributorSetup from "tests/utils/getEditionDistributorSetup";
import PriceFunctionType from "types/enum/PriceFunctionType";

const connection = getConnectionForTest();

// This corresponds to the same named program constant.
const NUMBER_OF_MERKLE_ROOTS_TO_STORE = 100;

const uniqueBuyers = generateKeypairArray(NUMBER_OF_MERKLE_ROOTS_TO_STORE);

const ALLOWLIST_SIZE =
  NUMBER_OF_MERKLE_ROOTS_TO_STORE * MERKLE_TREE_LEAF_COUNT_LIMIT;

/**
 * Instead of generating a ton of unique Keypairs, which will take a while,
 * this generates 1 for each tree, and just duplicates it (each tree will have
 * all the same leaves, but be the same size as a tree with unique leaves).
 *
 * This is to more quickly generate a giant allowlist for testing.
 *
 * The test will mint 1 edition for each stored merkle tree (each unique
 * keypair generated here).
 */
function generateGiantBuyersList(): Array<Keypair> {
  return uniqueBuyers
    .map((keypair) =>
      range(MERKLE_TREE_LEAF_COUNT_LIMIT).map((_) => cloneKeypair(keypair))
    )
    .flat();
}

const buyers = generateGiantBuyersList();

const buyersKeypairMap = createKeypairAddressMap(uniqueBuyers);

describe("buy edition v2 giant allowlist", () => {
  beforeAll(async () => {
    await requestAirdrops({
      connection,
      wallets: uniqueBuyers,
    });
    await fundSplTokenAtas(connection, uniqueBuyers);
  });

  test(`buy edition with the max sized allowlist of ${ALLOWLIST_SIZE} addresses`, async () => {
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

    const buyersToMint = allowlistedBuyers.map(
      (allowlistSection) => allowlistSection.buyersChunk[0]
    );

    await forEachAsync(buyersToMint, async (proofData, index) => {
      const buyerKeypair = buyersKeypairMap[proofData.address.toString()];
      await buyEditionForTest({
        auctionHouseAccount,
        auctionHouseSdk,
        buyerKeypair,
        buyerWithAllowlistProofData: proofData,
        connection,
        metadataData,
        nftOwner,
        price,
        proofTreeIndex: index,
        remainingAccounts,
        tokenMint,
      });
    });
  });
});
