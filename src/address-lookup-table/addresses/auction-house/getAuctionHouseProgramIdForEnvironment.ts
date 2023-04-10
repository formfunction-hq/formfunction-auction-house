import {
  assertUnreachable,
  Environment,
} from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";

export default function getAuctionHouseProgramIdForEnvironment(
  environment: Environment
): PublicKey {
  switch (environment) {
    case Environment.Local:
      return new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
    case Environment.Testnet:
      return new PublicKey("jzmdMPJhm7Txb2RzYPte6Aj1QWqFarmjsJuWjk9m2wv");
    case Environment.Development:
      return new PublicKey("devmBQyHHBPiLcuCqbWWRYxCG33ntAfPD5nXZeLd4eX");
    case Environment.Production:
      return new PublicKey("formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC");
    default: {
      return assertUnreachable(environment);
    }
  }
}
