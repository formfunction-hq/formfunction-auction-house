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
  limitPerAddress: number;
};

export default async function auctionHouseSetEditionDistributorLimitPerAddressIx(
  { auctionHouse, authority, mint, owner, program }: Accounts,
  { limitPerAddress }: Args
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
    .setEditionDistributorLimitPerAddress(limitPerAddress)
    .accounts({
      auctionHouse,
      authority,
      editionDistributor,
      owner: ownerAccount,
    })
    .instruction();
}
