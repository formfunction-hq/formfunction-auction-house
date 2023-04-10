import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import findEditionAllowlistSettingsAccount from "solana/pdas/findEditionAllowlistSettingsAccount";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  authority: PublicKey;
  mint: PublicKey;
  program: AuctionHouseProgram;
};

export default async function auctionHouseCloseEditionAllowlistSettingsAccountIx({
  auctionHouse,
  authority,
  mint,
  program,
}: Accounts): Promise<TransactionInstruction> {
  const [editionDistributor] = findEditionDistributor(mint, program.programId);
  const [editionAllowlistSettings] = findEditionAllowlistSettingsAccount(
    editionDistributor,
    program.programId
  );

  return program.methods
    .closeEditionAllowlistSettingsAccount()
    .accounts({
      auctionHouse,
      authority,
      editionAllowlistSettings,
      editionDistributor,
    })
    .instruction();
}
