import {
  findEditionPda,
  TOKEN_METADATA_PROGRAM_ID,
} from "@formfunction-hq/formfunction-program-shared";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { BN } from "bn.js";
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
  wallet: PublicKey;
};

type Args = {
  tokenSize?: number;
};

export default async function auctionHouseCancelV2Ix(
  {
    program,
    wallet,
    feeAccount,
    tokenAccount,
    tokenMint,
    priceInLamports,
    authority,
    auctionHouse,
    treasuryMint,
    auctionHouseProgramId,
  }: Accounts,
  { tokenSize = 1 }: Args
): Promise<TransactionInstruction> {
  const [tradeState, _tradeBump, buyPriceAdjusted] = await getTradeState({
    auctionHouse,
    auctionHouseProgramId,
    priceInLamports,
    tokenAccount,
    tokenMint,
    treasuryMint,
    wallet,
  });

  const [programAsSigner, programAsSignerBump] =
    findAuctionHouseProgramAsSigner(auctionHouseProgramId);
  const [masterEdition] = findEditionPda(tokenMint);
  return program.methods
    .cancelV2(buyPriceAdjusted, new BN(tokenSize), programAsSignerBump)
    .accounts({
      auctionHouse,
      auctionHouseFeeAccount: feeAccount,
      authority,
      masterEdition,
      metaplexTokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      programAsSigner,
      tokenAccount,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      tradeState,
      wallet,
    })
    .instruction();
}
