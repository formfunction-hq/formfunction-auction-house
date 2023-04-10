import {
  PdaResult,
  TOKEN_METADATA_PROGRAM_ID,
} from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";

export default function findTokenRecordPda(
  mint: PublicKey,
  token: PublicKey
): PdaResult {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("token_record"),
      token.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}
