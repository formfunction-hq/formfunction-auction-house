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
  treasuryMint: PublicKey;
};

type Args = {
  tickSizeConstantInLamports: number;
};

export default async function auctionHouseSetTickSizeIx(
  {
    auctionHouse,
    auctionHouseProgramId,
    authority,
    owner,
    program,
    tokenAccount,
    tokenMint,
    treasuryMint,
  }: Accounts,
  { tickSizeConstantInLamports }: Args
): Promise<TransactionInstruction> {
  const [lastBidPrice] = findLastBidPrice(tokenMint, auctionHouseProgramId);

  return program.methods
    .setTickSize(new BN(tickSizeConstantInLamports), 0, new BN(0), new BN(0))
    .accounts({
      auctionHouse,
      authority,
      lastBidPrice,
      mint: tokenMint,
      owner,
      tokenAccount,
      treasuryMint,
    })
    .instruction();
}
