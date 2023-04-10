import { Maybe } from "@formfunction-hq/formfunction-program-shared";
import { BN } from "@project-serum/anchor";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import getTradeState from "solana/auction-house/getTradeState";
import AuctionHouseProgram from "types/AuctionHouseProgram";
import SaleType from "types/enum/SaleType";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseFeeAccount: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  program: AuctionHouseProgram;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
  treasuryMint: PublicKey;
  wallet: PublicKey;
};

type Args = {
  allocationSize?: Maybe<number>;
  priceInLamports: number;
  saleType: SaleType;
  tokenSize?: number;
};

export default async function auctionHouseCreateTradeStateIx(
  {
    auctionHouse,
    auctionHouseFeeAccount,
    auctionHouseProgramId,
    authority,
    program,
    tokenAccount,
    tokenMint,
    treasuryMint,
    wallet,
  }: Accounts,
  { allocationSize, priceInLamports, saleType, tokenSize = 1 }: Args
): Promise<TransactionInstruction> {
  const [tradeState, tradeStateBump, buyPriceAdjusted] = await getTradeState({
    auctionHouse,
    auctionHouseProgramId,
    priceInLamports,
    tokenAccount,
    tokenMint,
    treasuryMint,
    wallet,
  });

  return program.methods
    .createTradeState(
      tradeStateBump,
      buyPriceAdjusted,
      new BN(tokenSize),
      saleType,
      allocationSize ?? null
    )
    .accounts({
      auctionHouse,
      auctionHouseFeeAccount,
      authority,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenAccount,
      tokenMint,
      tradeState,
      wallet,
    })
    .instruction();
}
