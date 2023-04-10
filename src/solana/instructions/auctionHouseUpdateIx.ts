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
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  authority: PublicKey;
  feeWithdrawalDestination: PublicKey;
  newAuthority: PublicKey;
  payer: PublicKey;
  program: AuctionHouseProgram;
  treasuryMint: PublicKey;
  treasuryWithdrawalDestination: PublicKey;
  treasuryWithdrawalDestinationOwner: PublicKey;
};

type Args = {
  basisPoints: number;
  basisPointsSecondary: number;
  canChangePrice: boolean;
  payAllFees: boolean;
  requiresSignOff: boolean;
};

export default async function auctionHouseUpdateIx(
  {
    program,
    authority,
    newAuthority,
    auctionHouse,
    treasuryMint,
    payer,
    feeWithdrawalDestination,
    treasuryWithdrawalDestination,
    treasuryWithdrawalDestinationOwner,
  }: Accounts,
  {
    basisPoints,
    requiresSignOff,
    canChangePrice,
    basisPointsSecondary,
    payAllFees,
  }: Args
): Promise<TransactionInstruction> {
  return program.methods
    .updateAuctionHouse(
      basisPoints,
      requiresSignOff,
      canChangePrice,
      basisPointsSecondary,
      payAllFees
    )
    .accounts({
      ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      auctionHouse,
      authority,
      feeWithdrawalDestination,
      newAuthority,
      payer,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      treasuryMint,
      treasuryWithdrawalDestination,
      treasuryWithdrawalDestinationOwner,
    })
    .instruction();
}
