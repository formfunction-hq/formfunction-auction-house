import {
  chunkArray,
  forEachAsync,
  randomNumberInRange,
} from "@formfunction-hq/formfunction-program-shared";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import APPEND_MERKLE_ROOTS_LIMIT_PER_TX from "tests/constants/AppendMerkleRootsLimitPerTx";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import MerkleAllowlistBuyersList from "types/merkle-tree/MerkleAllowlistBuyersList";
import constructMerkleEditionAllowlist from "utils/merkle-tree/constructMerkleEditionAllowlist";

export default async function createEditionAllowlist({
  auctionHouseSdk,
  buyers,
  connection,
  mint,
  auctionHouseAuthorityKeypair,
}: {
  auctionHouseAuthorityKeypair: Keypair;
  auctionHouseSdk: AuctionHouseSdk;
  buyers: Array<Keypair>;
  connection: Connection;
  mint: PublicKey;
}): Promise<Array<MerkleAllowlistBuyersList>> {
  const allowlistedBuyers = buyers.map((buyer) => ({
    address: buyer.publicKey,
    amount: randomNumberInRange(1, 4),
  }));
  const merkleAllowlistInfo = constructMerkleEditionAllowlist(
    mint,
    allowlistedBuyers
  );
  const uploadBatches = chunkArray(
    merkleAllowlistInfo,
    APPEND_MERKLE_ROOTS_LIMIT_PER_TX
  );

  await forEachAsync(uploadBatches, async (batch) => {
    const merkleRoots = batch.map((val) => val.tree.getRoot());
    const transaction =
      await auctionHouseSdk.appendEditionAllowlistMerkleRootsTx(
        { mint },
        { merkleRoots }
      );
    await sendTransactionWithWallet(
      connection,
      transaction,
      auctionHouseAuthorityKeypair
    );
  });

  return merkleAllowlistInfo;
}
