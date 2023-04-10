import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import findAuctionHouseBuyerEscrow from "solana/pdas/findAuctionHouseBuyerEscrow";
import findAuctionHouseFeeAccount from "solana/pdas/findAuctionHouseFeeAccount";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  program: AuctionHouseProgram;
  receiptAccount: PublicKey;
  tokenMint: PublicKey;
  treasuryMint: PublicKey;
  wallet: PublicKey;
};

type Args = {
  amount: number;
};

export default async function auctionHouseWithdrawIx(
  {
    program,
    wallet,
    receiptAccount,
    tokenMint,
    treasuryMint,
    authority,
    auctionHouse,
    auctionHouseProgramId,
  }: Accounts,
  { amount }: Args
): Promise<TransactionInstruction> {
  const [escrowPaymentAccount, escrowBump] = findAuctionHouseBuyerEscrow(
    auctionHouse,
    wallet,
    tokenMint,
    auctionHouseProgramId
  );
  const [feeAccount] = findAuctionHouseFeeAccount(
    auctionHouse,
    auctionHouseProgramId
  );

  return program.methods
    .withdraw(escrowBump, new BN(amount))
    .accounts({
      ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      auctionHouse,
      auctionHouseFeeAccount: feeAccount,
      authority,
      escrowPaymentAccount,
      receiptAccount,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      treasuryMint,
      wallet,
    })
    .instruction();
}
