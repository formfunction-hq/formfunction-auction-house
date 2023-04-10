import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  authority: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  program: AuctionHouseProgram;
  rentReceiver: PublicKey;
};

export default async function auctionHouseCloseEditionDistributorIx({
  auctionHouse,
  authority,
  mint,
  owner,
  program,
  rentReceiver,
}: Accounts): Promise<TransactionInstruction> {
  const [editionDistributor] = findEditionDistributor(mint, program.programId);

  return program.methods
    .closeEditionDistributor()
    .accounts({
      auctionHouse,
      authority,
      editionDistributor,
      masterEditionMint: mint,
      owner,
      rentReceiver,
    })
    .instruction();
}
