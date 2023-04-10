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
  feeAccount: PublicKey;
  feeWithdrawalDestination: PublicKey;
  payer: PublicKey;
  program: AuctionHouseProgram;
  treasuryAccount: PublicKey;
  treasuryMint: PublicKey;
  treasuryWithdrawalDestination: PublicKey;
  treasuryWithdrawalDestinationOwner: PublicKey;
};

type Args = {
  auctionHouseBump: number;
  basisPoints: number;
  basisPointsSecondary: number;
  canChangePrice: boolean;
  feeBump: number;
  payAllFees: boolean;
  requiresSignOff: boolean;
  treasuryBump: number;
};

export default async function auctionHouseCreateIx(
  {
    program,
    authority,
    auctionHouse,
    treasuryMint,
    payer,
    feeWithdrawalDestination,
    treasuryWithdrawalDestination,
    treasuryWithdrawalDestinationOwner,
    feeAccount,
    treasuryAccount,
  }: Accounts,
  {
    auctionHouseBump,
    feeBump,
    treasuryBump,
    basisPoints,
    requiresSignOff,
    canChangePrice,
    basisPointsSecondary,
    payAllFees,
  }: Args
): Promise<TransactionInstruction> {
  return program.methods
    .createAuctionHouse(
      auctionHouseBump,
      feeBump,
      treasuryBump,
      basisPoints,
      requiresSignOff,
      canChangePrice,
      basisPointsSecondary,
      payAllFees
    )
    .accounts({
      ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      auctionHouse,
      auctionHouseFeeAccount: feeAccount,
      auctionHouseTreasury: treasuryAccount,
      authority,
      feeWithdrawalDestination,
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
