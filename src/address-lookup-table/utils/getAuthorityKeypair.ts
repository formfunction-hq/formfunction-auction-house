import {
  assertUnreachable,
  Environment,
} from "@formfunction-hq/formfunction-program-shared";
import { Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";

function readKeypair(keypairFilePath: string): Keypair {
  const arr = JSON.parse(readFileSync(keypairFilePath).toString());
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export default function getAuthorityKeypair(environment: Environment): Keypair {
  switch (environment) {
    case Environment.Local:
      return readKeypair("keys/localnet.json");
    case Environment.Testnet:
      return readKeypair("keys/testnet/deployer-keypair.json");
    case Environment.Development:
      return readKeypair("keys/devnet/deployer-keypair.json");
    case Environment.Production: {
      throw new Error(
        `Please provide a mainnet keypair in ${getAuthorityKeypair.name} and remove this error.`
      );
      return readKeypair("keys/mainnet/keypair.json");
    }
    default: {
      return assertUnreachable(environment);
    }
  }
}
