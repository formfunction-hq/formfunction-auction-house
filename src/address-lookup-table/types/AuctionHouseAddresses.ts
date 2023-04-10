import { PublicKey } from "@solana/web3.js";

type AuctionHouseAddresses = {
  antiBotAuthority: PublicKey;
  auctionHouse: PublicKey;
  authority: PublicKey;
  feeAccount: PublicKey;
  programId: PublicKey;
  treasuryAccount: PublicKey;
  treasuryMint: PublicKey;
};

export default AuctionHouseAddresses;
