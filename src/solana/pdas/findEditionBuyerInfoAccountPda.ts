import { PdaResult } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import { EDITION_BUYER_INFO_ACCOUNT } from "constants/SolanaConstants";

export default function findEditionBuyerInfoAccountPda(
  mint: PublicKey,
  buyer: PublicKey,
  auctionHouseProgramId: PublicKey
): PdaResult {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(EDITION_BUYER_INFO_ACCOUNT),
      mint.toBuffer(),
      buyer.toBuffer(),
    ],
    auctionHouseProgramId
  );
}
