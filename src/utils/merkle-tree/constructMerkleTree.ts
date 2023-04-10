import { MerkleTree } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import MerkleAllowlistBuyerInfo from "types/merkle-tree/MerkleAllowlistBuyerInfo";
import constructMerkleLeafNode from "utils/merkle-tree/constructMerkleLeafNode";

export default function constructMerkleTree(
  buyers: Array<MerkleAllowlistBuyerInfo>,
  masterEditionMint: PublicKey
): MerkleTree {
  const leafs: Array<Buffer> = [];
  buyers.forEach((buyer) => {
    leafs.push(constructMerkleLeafNode(buyer, masterEditionMint));
  });
  return new MerkleTree(leafs);
}
