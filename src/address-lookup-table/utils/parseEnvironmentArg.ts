import {
  Environment,
  MaybeUndef,
} from "@formfunction-hq/formfunction-program-shared";

export default function parseEnvironmentArg(
  environment: MaybeUndef<string>
): Environment {
  switch (environment) {
    case "local":
      return Environment.Local;
    case "devnet":
      return Environment.Development;
    case "testnet":
      return Environment.Testnet;
    case "mainnet":
      return Environment.Production;
    default: {
      throw new Error(
        `Invalid environment argument supplied, received: ${environment}.`
      );
    }
  }
}
