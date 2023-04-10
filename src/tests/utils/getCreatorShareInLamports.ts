import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
} from "tests/constants/AuctionHouse";

export default function getCreatorShareInLamports(
  buyPriceInSol: number,
  creatorShare: number,
  basisPoints: number,
  isPrimary: boolean
) {
  const buyPriceInLamports = buyPriceInSol * LAMPORTS_PER_SOL;
  const auctionHouseFeePercentage = isPrimary
    ? BASIS_POINTS * 1e-4 // 10%
    : BASIS_POINTS_SECONDARY * 1e-4; // 1%
  const priceWithoutFees =
    buyPriceInLamports - buyPriceInLamports * auctionHouseFeePercentage;
  const royalties = isPrimary
    ? priceWithoutFees // primary: creators split all
    : buyPriceInLamports * (basisPoints * 1e-4); // secondary: creators only split royalties based on bps

  return royalties * (creatorShare / 100);
}
