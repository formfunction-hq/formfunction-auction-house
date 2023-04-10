import { PublicKey } from "@solana/web3.js";

type MerkleAllowlistBuyerInfo = {
  address: PublicKey;
  amount: number;
};

export default MerkleAllowlistBuyerInfo;
