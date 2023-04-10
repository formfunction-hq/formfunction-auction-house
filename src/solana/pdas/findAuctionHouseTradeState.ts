import { PdaResult } from "@formfunction-hq/formfunction-program-shared";
import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { AUCTION_HOUSE } from "constants/SolanaConstants";

export default function findAuctionHouseTradeState(
  auctionHouse: PublicKey,
  wallet: PublicKey,
  tokenAccount: PublicKey,
  treasuryMint: PublicKey,
  tokenMint: PublicKey,
  tokenSize: BN,
  buyPrice: BN,
  auctionHouseProgramId: PublicKey
): PdaResult {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(AUCTION_HOUSE),
      wallet.toBuffer(),
      auctionHouse.toBuffer(),
      tokenAccount.toBuffer(),
      treasuryMint.toBuffer(),
      tokenMint.toBuffer(),
      buyPrice.toArrayLike(Buffer, "le", 8),
      tokenSize.toArrayLike(Buffer, "le", 8),
    ],
    auctionHouseProgramId
  );
}
