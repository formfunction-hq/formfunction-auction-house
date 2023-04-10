import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { BN } from "bn.js";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  owner: PublicKey;
  program: AuctionHouseProgram;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
};

type Args = {
  price?: number;
};

export default async function auctionHouseSetLastBidPriceIx(
  {
    program,
    authority,
    owner,
    tokenAccount,
    tokenMint,
    auctionHouse,
    auctionHouseProgramId,
  }: Accounts,
  { price = 0 }: Args
): Promise<TransactionInstruction> {
  const [lastBidPrice] = findLastBidPrice(tokenMint, auctionHouseProgramId);

  return program.methods
    .setLastBidPrice(new BN(price))
    .accounts({
      auctionHouse,
      authority,
      lastBidPrice,
      owner,
      tokenAccount,
    })
    .instruction();
}
