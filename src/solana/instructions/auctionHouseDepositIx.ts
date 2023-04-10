import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import findAuctionHouseBuyerEscrow from "solana/pdas/findAuctionHouseBuyerEscrow";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  feeAccount: PublicKey;
  paymentAccount: PublicKey;
  program: AuctionHouseProgram;
  tokenMint: PublicKey;
  transferAuthority: PublicKey;
  treasuryMint: PublicKey;
  wallet: PublicKey;
};

type Args = {
  amount: number;
};

export default async function auctionHouseDepositIx(
  {
    program,
    wallet,
    feeAccount,
    paymentAccount,
    transferAuthority = SystemProgram.programId,
    tokenMint,
    authority,
    auctionHouse,
    treasuryMint,
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

  return program.methods
    .deposit(escrowBump, new BN(amount))
    .accounts({
      auctionHouse,
      auctionHouseFeeAccount: feeAccount,
      authority,
      escrowPaymentAccount,
      paymentAccount,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      transferAuthority,
      treasuryMint,
      wallet,
    })
    .instruction();
}
