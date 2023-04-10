import { findAtaPda } from "@formfunction-hq/formfunction-program-shared";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
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
  tokenReceiver: PublicKey;
};

export default async function auctionHouseCloseEditionDistributorTokenAccountIx({
  auctionHouse,
  authority,
  mint,
  owner,
  program,
  rentReceiver,
  tokenReceiver,
}: Accounts): Promise<TransactionInstruction> {
  const [editionDistributor] = findEditionDistributor(mint, program.programId);
  const [editionDistributorTokenAccount] = findAtaPda(editionDistributor, mint);

  return program.methods
    .closeEditionDistributorTokenAccount()
    .accounts({
      auctionHouse,
      authority,
      editionDistributor,
      editionDistributorTokenAccount,
      masterEditionMint: mint,
      owner,
      rentReceiver,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenReceiver,
    })
    .instruction();
}
