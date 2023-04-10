import { PdaResult } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import { AUCTION_HOUSE } from "constants/SolanaConstants";

export default function findAuctionHouseBuyerEscrow(
  auctionHouse: PublicKey,
  wallet: PublicKey,
  tokenMint: PublicKey,
  auctionHouseProgramId: PublicKey
): PdaResult {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(AUCTION_HOUSE),
      auctionHouse.toBuffer(),
      wallet.toBuffer(),
      tokenMint.toBuffer(),
    ],
    auctionHouseProgramId
  );
}
