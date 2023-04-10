import { findTokenMetadataPda } from "@formfunction-hq/formfunction-program-shared";
import { web3 } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { BN } from "bn.js";
import { Dayjs } from "dayjs";
import getTradeState from "solana/auction-house/getTradeState";
import findAuctionHouseBuyerEscrow from "solana/pdas/findAuctionHouseBuyerEscrow";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import getWalletIfNativeElseAta from "solana/utils/getWalletIfNativeElseAta";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  feeAccount: PublicKey;
  previousBidderRefundAccount: PublicKey;
  previousBidderWallet: PublicKey;
  priceInLamports: number;
  program: AuctionHouseProgram;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
  treasuryMint: PublicKey;
  walletBuyer: PublicKey;
};

type Args = {
  auctionEndTime?: Dayjs;
  tokenSize?: number;
};

export default async function auctionHouseBuyV2Ix(
  {
    program,
    walletBuyer,
    tokenAccount,
    tokenMint,
    priceInLamports,
    treasuryMint,
    authority,
    auctionHouse,
    auctionHouseProgramId,
    feeAccount,
    previousBidderRefundAccount,
    previousBidderWallet,
  }: Accounts,
  { auctionEndTime, tokenSize = 1 }: Args
): Promise<TransactionInstruction> {
  const [tradeState, tradeBump, buyPriceAdjusted] = await getTradeState({
    auctionHouse,
    auctionHouseProgramId,
    priceInLamports,
    tokenAccount,
    tokenMint,
    treasuryMint,
    wallet: walletBuyer,
  });
  const [escrowPaymentAccount, escrowBump] = findAuctionHouseBuyerEscrow(
    auctionHouse,
    walletBuyer,
    tokenMint,
    auctionHouseProgramId
  );
  const [previousBidderEscrowPaymentAccount, previousBidderEscrowBump] =
    findAuctionHouseBuyerEscrow(
      auctionHouse,
      previousBidderWallet,
      tokenMint,
      auctionHouseProgramId
    );
  const [metadata] = findTokenMetadataPda(tokenMint);
  const [lastBidPrice] = findLastBidPrice(tokenMint, auctionHouseProgramId);
  const paymentAccount = await getWalletIfNativeElseAta(
    walletBuyer,
    treasuryMint
  );

  return program.methods
    .buyV2(
      tradeBump,
      escrowBump,
      buyPriceAdjusted,
      new BN(tokenSize),
      auctionEndTime == null ? null : new BN(auctionEndTime.unix()),
      previousBidderEscrowBump
    )
    .accounts({
      ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      auctionHouse,
      auctionHouseFeeAccount: feeAccount,
      authority,
      buyerTradeState: tradeState,
      clock: web3.SYSVAR_CLOCK_PUBKEY,
      escrowPaymentAccount,
      lastBidPrice,
      metadata,
      paymentAccount,
      previousBidderEscrowPaymentAccount,
      previousBidderRefundAccount,
      // New from v1
      previousBidderWallet,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
      tokenAccount,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      transferAuthority: walletBuyer,
      treasuryMint,
      wallet: walletBuyer,
    })
    .instruction();
}
