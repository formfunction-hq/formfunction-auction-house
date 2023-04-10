import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  program: AuctionHouseProgram;
  tokenMint: PublicKey;
};

type Args = {
  hasBeenSold: boolean;
};

export default async function auctionHouseSetHasBeenSoldIx(
  {
    program,
    authority,
    tokenMint,
    auctionHouse,
    auctionHouseProgramId,
  }: Accounts,
  { hasBeenSold }: Args
): Promise<TransactionInstruction> {
  const [lastBidPrice] = findLastBidPrice(tokenMint, auctionHouseProgramId);

  return program.methods
    .setHasBeenSold(hasBeenSold)
    .accounts({
      auctionHouse,
      authority,
      lastBidPrice,
      tokenMint,
    })
    .instruction();
}
