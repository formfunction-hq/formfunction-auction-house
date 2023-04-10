import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  authority: PublicKey;
  mint: PublicKey;
  owner?: PublicKey;
  program: AuctionHouseProgram;
};

type Args = {
  antiBotProtectionEnabled: boolean;
};

export default async function auctionHouseSetEditionDistributorAntiBotProtectionEnabledIx(
  { auctionHouse, authority, mint, owner, program }: Accounts,
  { antiBotProtectionEnabled }: Args
): Promise<TransactionInstruction> {
  const [editionDistributor] = findEditionDistributor(mint, program.programId);

  const ownerAccount =
    owner ??
    (
      await program.account.editionDistributor.fetch(
        editionDistributor,
        "confirmed"
      )
    ).owner;

  return program.methods
    .setEditionDistributorBotProtectionEnabled(antiBotProtectionEnabled)
    .accounts({
      auctionHouse,
      authority,
      editionDistributor,
      mint,
      owner: ownerAccount,
    })
    .instruction();
}
