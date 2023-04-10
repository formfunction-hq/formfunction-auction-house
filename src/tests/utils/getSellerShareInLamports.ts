import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BASIS_POINTS_SECONDARY } from "tests/constants/AuctionHouse";

// Get remaining amount after paying auction house fees + creator royalties for secondary sales
export default function getSellerShareInLamports(
  buyPriceInSol: number,
  creatorRoyaltiesBasisPoints: number
) {
  const buyPriceInLamports = buyPriceInSol * LAMPORTS_PER_SOL;
  const auctionHouseFeePercentage = BASIS_POINTS_SECONDARY * 1e-4; // 1%
  const feesPaid = buyPriceInLamports * auctionHouseFeePercentage;
  const royaltiesPaid = buyPriceInLamports * creatorRoyaltiesBasisPoints * 1e-4;

  return buyPriceInLamports - feesPaid - royaltiesPaid;
}
