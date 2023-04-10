import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  authority: PublicKey;
  bonkTokenAccount: PublicKey;
  mint: PublicKey;
  program: AuctionHouseProgram;
  tokenReceiver: PublicKey;
};

export default async function auctionHouseWithdrawBonkIx({
  auctionHouse,
  authority,
  mint,
  program,
  bonkTokenAccount,
  tokenReceiver,
}: Accounts): Promise<TransactionInstruction> {
  const [editionDistributor] = findEditionDistributor(mint, program.programId);

  return program.methods
    .withdrawBonk()
    .accounts({
      auctionHouse,
      authority,
      editionDistributor,
      editionDistributorTokenAccount: bonkTokenAccount,
      masterEditionMint: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenReceiver,
    })
    .instruction();
}
