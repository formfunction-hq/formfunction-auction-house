import {
  ANTI_BOT_DEV_AUTHORITY,
  ANTI_BOT_MAINNET_AUTHORITY,
  assertUnreachable,
  Environment,
} from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";

export default function getAntiBotAuthorityForEnvironment(
  environment: Environment
): PublicKey {
  switch (environment) {
    case Environment.Local:
    case Environment.Testnet:
    case Environment.Development:
      return ANTI_BOT_DEV_AUTHORITY;
    case Environment.Production:
      return ANTI_BOT_MAINNET_AUTHORITY;
    default: {
      return assertUnreachable(environment);
    }
  }
}
