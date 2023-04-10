import {
  findEditionPda,
  findTokenMetadataPda,
  TOKEN_METADATA_PROGRAM_ID,
} from "@formfunction-hq/formfunction-program-shared";
import { web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { BN } from "bn.js";
import getSellerFreeTradeState from "solana/auction-house/getSellerFreeTradeState";
import getTradeState from "solana/auction-house/getTradeState";
import findAuctionHouseProgramAsSigner from "solana/pdas/findAuctionHouseProgramAsSigner";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  feeAccount: PublicKey;
  priceInLamports: number;
  program: AuctionHouseProgram;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
  treasuryMint: PublicKey;
  walletSeller: PublicKey;
};

type Args = {
  tokenSize?: number;
};

export default async function auctionHouseSellIx(
  {
    program,
    walletSeller,
    tokenAccount,
    feeAccount,
    tokenMint,
    priceInLamports,
    authority,
    auctionHouse,
    treasuryMint,
    auctionHouseProgramId,
  }: Accounts,
  { tokenSize = 1 }: Args
): Promise<TransactionInstruction> {
  const [tradeState, tradeBump, buyPriceAdjusted] = await getTradeState({
    auctionHouse,
    auctionHouseProgramId,
    priceInLamports,
    tokenAccount,
    tokenMint,
    treasuryMint,
    wallet: walletSeller,
  });
  const [programAsSigner, programAsSignerBump] =
    findAuctionHouseProgramAsSigner(auctionHouseProgramId);
  const [masterEdition] = findEditionPda(tokenMint);
  const [metadata] = findTokenMetadataPda(tokenMint);
  const [freeTradeState, freeTradeBump] = await getSellerFreeTradeState({
    auctionHouse,
    auctionHouseProgramId,
    tokenAccount,
    tokenMint,
    treasuryMint,
    wallet: walletSeller,
  });

  return program.methods
    .sell(
      tradeBump,
      freeTradeBump,
      programAsSignerBump,
      buyPriceAdjusted,
      new BN(tokenSize)
    )
    .accounts({
      auctionHouse,
      auctionHouseFeeAccount: feeAccount,
      authority,
      freeSellerTradeState: freeTradeState,
      masterEdition,
      metadata,
      metaplexTokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      programAsSigner,
      rent: web3.SYSVAR_RENT_PUBKEY,
      sellerTradeState: tradeState,
      systemProgram: web3.SystemProgram.programId,
      tokenAccount,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      wallet: walletSeller,
    })
    .instruction();
}
