import { PdaResult } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import { EDITION_ALLOWLIST } from "constants/SolanaConstants";

export default function findEditionAllowlistSettingsAccount(
  editionDistributor: PublicKey,
  auctionHouseProgramId: PublicKey
): PdaResult {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(EDITION_ALLOWLIST), editionDistributor.toBuffer()],
    auctionHouseProgramId
  );
}
