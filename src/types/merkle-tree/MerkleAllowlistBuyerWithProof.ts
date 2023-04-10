import MerkleAllowlistBuyerInfo from "types/merkle-tree/MerkleAllowlistBuyerInfo";

interface MerkleAllowlistBuyerWithProof extends MerkleAllowlistBuyerInfo {
  merkleTreeIndex: number;
  serializedProof: string;
}

export default MerkleAllowlistBuyerWithProof;
