import { PublicKey } from "@solana/web3.js";

type AuctionHouseOverrideForTest = {
  auctionHouse: PublicKey;
  authority: PublicKey;
  treasuryMint: PublicKey;
};

export default AuctionHouseOverrideForTest;
