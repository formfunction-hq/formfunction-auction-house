import {
  chunkArray,
  getCompareByPropertyFunction,
  serializeMerkleProof,
} from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import MERKLE_TREE_LEAF_COUNT_LIMIT from "constants/MerkleTreeLeafCountLimit";
import MerkleAllowlistBuyerInfo from "types/merkle-tree/MerkleAllowlistBuyerInfo";
import MerkleAllowlistBuyersList from "types/merkle-tree/MerkleAllowlistBuyersList";
import MerkleAllowlistBuyerWithProof from "types/merkle-tree/MerkleAllowlistBuyerWithProof";
import constructMerkleTree from "utils/merkle-tree/constructMerkleTree";

export default function constructMerkleEditionAllowlist(
  masterEditionMint: PublicKey,
  buyers: Array<MerkleAllowlistBuyerInfo>,
  merkleTreeLeafSizeLimit = MERKLE_TREE_LEAF_COUNT_LIMIT
): Array<MerkleAllowlistBuyersList> {
  buyers.sort(getCompareByPropertyFunction("address", (val) => val.toString()));
  return chunkArray(buyers, merkleTreeLeafSizeLimit).map(
    (chunk, merkleTreeIndex) => {
      const tree = constructMerkleTree(chunk, masterEditionMint);
      const buyersChunk = chunk.map((buyer, index) => {
        const proof = tree.getProof(index);
        const { amount, address } = buyer;
        const proofData: MerkleAllowlistBuyerWithProof = {
          address,
          amount,
          merkleTreeIndex,
          serializedProof: serializeMerkleProof(proof),
        };
        return proofData;
      });
      return { buyersChunk, tree };
    }
  );
}
