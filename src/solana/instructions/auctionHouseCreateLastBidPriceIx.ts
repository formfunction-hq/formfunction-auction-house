import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  program: AuctionHouseProgram;
  tokenMint: PublicKey;
  wallet: PublicKey;
};

export default async function auctionHouseCreateLastBidPriceIx({
  program,
  wallet,
  tokenMint,
  auctionHouse,
  auctionHouseProgramId,
}: Accounts): Promise<TransactionInstruction> {
  const [lastBidPrice] = findLastBidPrice(tokenMint, auctionHouseProgramId);

  return program.methods
    .createLastBidPrice()
    .accounts({
      auctionHouse,
      lastBidPrice,
      systemProgram: SystemProgram.programId,
      tokenMint,
      wallet,
    })
    .instruction();
}
