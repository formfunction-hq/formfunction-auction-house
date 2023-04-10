import {
  assertUnreachable,
  Environment,
} from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";

export const ADDRESS_LOOKUP_TABLE_TESTNET = new PublicKey(
  "6cqjCGDNpwqf2Uz1QW9SCiusDRBsCymB8WVLkfbombHu"
);

export const ADDRESS_LOOKUP_TABLE_DEVNET = new PublicKey(
  "GLeSXHPHPeQ4JizrA6eCBGJGqLb34DnDUYcdhVfkqpAV"
);

export const ADDRESS_LOOKUP_TABLE_MAINNET = new PublicKey(
  "7CTJMVhehAXpzEMgmfSVoiCwtLFchECGEUGRnSEkNzk2"
);

export default function getAddressLookupTableForEnvironment(
  environment: Environment
): PublicKey {
  switch (environment) {
    case Environment.Testnet:
      return ADDRESS_LOOKUP_TABLE_TESTNET;
    case Environment.Local:
    case Environment.Development:
      return ADDRESS_LOOKUP_TABLE_DEVNET;
    case Environment.Production:
      return ADDRESS_LOOKUP_TABLE_MAINNET;
    default: {
      return assertUnreachable(environment);
    }
  }
}
