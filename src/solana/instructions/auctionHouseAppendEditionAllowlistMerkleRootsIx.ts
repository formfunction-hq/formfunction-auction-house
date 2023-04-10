import { MerkleRoot } from "@formfunction-hq/formfunction-program-shared";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import findEditionAllowlistSettingsAccount from "solana/pdas/findEditionAllowlistSettingsAccount";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  authority: PublicKey;
  mint: PublicKey;
  program: AuctionHouseProgram;
};

type Args = {
  merkleRoots: Array<MerkleRoot>;
};

export default async function auctionHouseAppendEditionAllowlistMerkleRootsIx(
  { auctionHouse, authority, mint, program }: Accounts,
  { merkleRoots }: Args
): Promise<TransactionInstruction> {
  const [editionDistributor] = findEditionDistributor(mint, program.programId);
  const [editionAllowlistSettings] = findEditionAllowlistSettingsAccount(
    editionDistributor,
    program.programId
  );

  return (
    program.methods
      // TODO[@bonham000]: Figure out if the merkleRoots argument is the correct type.
      .appendEditionAllowlistMerkleRoots(merkleRoots.map((val) => [...val]))
      .accounts({
        auctionHouse,
        authority,
        editionAllowlistSettings,
        editionDistributor,
        systemProgram: SystemProgram.programId,
      })
      .instruction()
  );
}
