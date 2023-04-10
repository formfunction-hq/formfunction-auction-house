import {
  findEditionPda,
  TOKEN_METADATA_PROGRAM_ID,
} from "@formfunction-hq/formfunction-program-shared";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import findAuctionHouseProgramAsSigner from "solana/pdas/findAuctionHouseProgramAsSigner";
import AuctionHouseProgram from "types/AuctionHouseProgram";

type Accounts = {
  auctionHouse: PublicKey;
  auctionHouseProgramId: PublicKey;
  authority: PublicKey;
  program: AuctionHouseProgram;
  tokenAccount: PublicKey;
  tokenMint: PublicKey;
  walletSeller: PublicKey;
};

export default async function auctionHouseThawDelegatedAccountIx({
  auctionHouse,
  auctionHouseProgramId,
  authority,
  program,
  tokenAccount,
  tokenMint,
  walletSeller,
}: Accounts): Promise<TransactionInstruction> {
  const [masterEdition] = findEditionPda(tokenMint);
  const [programAsSigner, programAsSignerBump] =
    findAuctionHouseProgramAsSigner(auctionHouseProgramId);
  return program.methods
    .thawDelegatedAccount(programAsSignerBump)
    .accounts({
      auctionHouse,
      authority,
      masterEdition,
      metaplexTokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      programAsSigner,
      seller: walletSeller,
      tokenAccount,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}
