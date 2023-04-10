import { MerkleLeaf } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import MerkleAllowlistBuyerInfo from "types/merkle-tree/MerkleAllowlistBuyerInfo";

// Must be consistent with the program proof verification amount size in bytes.
const amountNumBytes = 2;

export default function constructMerkleLeafNode(
  buyer: MerkleAllowlistBuyerInfo,
  masterEditionMint: PublicKey
): MerkleLeaf {
  return Buffer.from([
    ...buyer.address.toBuffer(),
    ...masterEditionMint.toBuffer(),
    ...new BN(buyer.amount).toArray("le", amountNumBytes),
  ]);
}
