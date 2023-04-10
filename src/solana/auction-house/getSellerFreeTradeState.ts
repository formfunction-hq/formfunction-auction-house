import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import getTradeState from "solana/auction-house/getTradeState";

export default async function getFreeTradeState({
  wallet,
  tokenAccount,
  tokenMint,
  auctionHouse,
  treasuryMint,
  auctionHouseProgramId,
  tokenSize = 1,
}: {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
  tokenSize?: number;
  treasuryMint: PublicKey;
  wallet: PublicKey;
}): Promise<[PublicKey, number, BN]> {
  return getTradeState({
    auctionHouse,
    auctionHouseProgramId,
    priceInLamports: 0,
    tokenAccount,
    tokenMint,
    tokenSize,
    treasuryMint,
    wallet,
  });
}
