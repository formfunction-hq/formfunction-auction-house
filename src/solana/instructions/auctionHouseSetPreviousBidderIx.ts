import { Maybe } from "@formfunction-hq/formfunction-program-shared";
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
  bidder: Maybe<PublicKey>;
};

export default async function auctionHouseSetPreviousBidderIx(
  {
    program,
    authority,
    tokenMint,
    auctionHouse,
    auctionHouseProgramId,
  }: Accounts,
  { bidder }: Args
): Promise<TransactionInstruction> {
  const [lastBidPrice] = findLastBidPrice(tokenMint, auctionHouseProgramId);

  return program.methods
    .setPreviousBidder(bidder)
    .accounts({
      auctionHouse,
      authority,
      lastBidPrice,
      tokenMint,
    })
    .instruction();
}
