import { TOKEN_METADATA_PROGRAM_ID } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";

const ADDRESSES = [TOKEN_METADATA_PROGRAM_ID];

export default function getThirdPartyAddresses(): Array<PublicKey> {
  return ADDRESSES;
}
