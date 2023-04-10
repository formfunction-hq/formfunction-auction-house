import {
  findAtaPda,
  findEditionPda,
  findTokenMetadataPda,
  TOKEN_METADATA_PROGRAM_ID,
} from "@formfunction-hq/formfunction-program-shared";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import getSellerFreeTradeState from "solana/auction-house/getSellerFreeTradeState";
import getTradeState from "solana/auction-house/getTradeState";
import findAuctionHouseBuyerEscrow from "solana/pdas/findAuctionHouseBuyerEscrow";
import findAuctionHouseFeeAccount from "solana/pdas/findAuctionHouseFeeAccount";
import findAuctionHouseProgramAsSigner from "solana/pdas/findAuctionHouseProgramAsSigner";
import findAuctionHouseTreasuryAccount from "solana/pdas/findAuctionHouseTreasuryAccount";
import getWalletIfNativeElseAta from "solana/utils/getWalletIfNativeElseAta";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  buyerPriceInLamports: number;
  buyerReceiptTokenAccount?: PublicKey;
  lastBidPrice: PublicKey;
  program: AuctionHouseProgram;
  sellerPriceInLamports: number;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
  treasuryMint: PublicKey;
  walletBuyer: PublicKey;
  walletCreator: PublicKey;
  walletSeller: PublicKey;
};

type Args = {
  tokenSize?: number;
};

export default async function auctionHouseExecuteSaleIx(
  {
    auctionHouse,
    auctionHouseProgramId,
    authority,
    buyerPriceInLamports,
    buyerReceiptTokenAccount,
    lastBidPrice,
    program,
    sellerPriceInLamports,
    tokenAccount,
    tokenMint,
    treasuryMint,
    walletBuyer,
    walletCreator,
    walletSeller,
  }: Accounts,
  { tokenSize = 1 }: Args,
  remainingAccounts?: Array<AccountMeta>
): Promise<TransactionInstruction> {
  const [escrowPaymentAccount, escrowBump] = findAuctionHouseBuyerEscrow(
    auctionHouse,
    walletBuyer,
    tokenMint,
    auctionHouseProgramId
  );
  const [freeTradeState, freeTradeBump] = await getSellerFreeTradeState({
    auctionHouse,
    auctionHouseProgramId,
    tokenAccount,
    tokenMint,
    treasuryMint,
    wallet: walletSeller,
  });
  const [programAsSigner, programAsSignerBump] =
    findAuctionHouseProgramAsSigner(auctionHouseProgramId);

  const [buyerTradeState, _buyerTradeBump, buyPriceAdjusted] =
    await getTradeState({
      auctionHouse,
      auctionHouseProgramId,
      priceInLamports: buyerPriceInLamports,
      tokenAccount,
      tokenMint,
      treasuryMint,
      wallet: walletBuyer,
    });

  const [sellerTradeState, _sellerTradeBump, sellPriceAdjusted] =
    await getTradeState({
      auctionHouse,
      auctionHouseProgramId,
      priceInLamports: sellerPriceInLamports,
      tokenAccount,
      tokenMint,
      treasuryMint,
      wallet: walletSeller,
    });

  const [metadata] = findTokenMetadataPda(tokenMint);
  const [feeAccount] = findAuctionHouseFeeAccount(
    auctionHouse,
    auctionHouseProgramId
  );
  const [treasuryAccount] = findAuctionHouseTreasuryAccount(
    auctionHouse,
    auctionHouseProgramId
  );
  const [buyerReceiptTokenAccountAta] = findAtaPda(walletBuyer, tokenMint);
  const [masterEdition] = findEditionPda(tokenMint);

  return program.methods
    .executeSaleV2(
      escrowBump,
      freeTradeBump,
      programAsSignerBump,
      buyPriceAdjusted,
      sellPriceAdjusted,
      new BN(tokenSize)
    )
    .accounts({
      ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      auctionHouse,
      auctionHouseFeeAccount: feeAccount,
      auctionHouseTreasury: treasuryAccount,
      authority,
      buyer: walletBuyer,
      buyerReceiptTokenAccount:
        buyerReceiptTokenAccount ?? buyerReceiptTokenAccountAta,
      buyerTradeState,
      escrowPaymentAccount,
      freeTradeState,
      lastBidPrice,
      masterEdition,
      metadata,
      metaplexTokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      programAsSigner,
      rent: SYSVAR_RENT_PUBKEY,
      seller: walletSeller,
      sellerPaymentReceiptAccount: await getWalletIfNativeElseAta(
        walletSeller,
        treasuryMint
      ),
      sellerTradeState,
      systemProgram: SystemProgram.programId,
      tokenAccount,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      treasuryMint,
    })
    .remainingAccounts(
      // Not documented in the accounts struct... see pay_creator_fees
      remainingAccounts ?? [
        {
          isSigner: false,
          isWritable: true,
          pubkey: walletCreator,
        },
      ]
    )
    .instruction();
}
