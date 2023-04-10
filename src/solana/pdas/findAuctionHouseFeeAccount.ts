import { PdaResult } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import { AUCTION_HOUSE, FEE_PAYER } from "constants/SolanaConstants";

export default function findAuctionHouseFeeAccount(
  auctionHouse: PublicKey,
  auctionHouseProgramId: PublicKey
): PdaResult {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(AUCTION_HOUSE),
      auctionHouse.toBuffer(),
      Buffer.from(FEE_PAYER),
    ],
    auctionHouseProgramId
  );
}
