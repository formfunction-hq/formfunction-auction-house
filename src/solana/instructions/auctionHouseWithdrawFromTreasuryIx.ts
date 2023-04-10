import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  authority: PublicKey;
  program: AuctionHouseProgram;
  treasuryAccount: PublicKey;
  treasuryMint: PublicKey;
  treasuryWithdrawalDestination: PublicKey;
};

type Args = {
  amount: number;
};

export default async function auctionHouseWithdrawFromTreasuryIx(
  {
    program,
    treasuryWithdrawalDestination,
    treasuryAccount,
    treasuryMint,
    authority,
    auctionHouse,
  }: Accounts,
  { amount }: Args
): Promise<TransactionInstruction> {
  return program.methods
    .withdrawFromTreasury(new BN(amount))
    .accounts({
      auctionHouse,
      auctionHouseTreasury: treasuryAccount,
      authority,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      treasuryMint,
      treasuryWithdrawalDestination,
    })
    .instruction();
}
