import {
  assertUnreachable,
  Environment,
  requestAirdrops,
} from "@formfunction-hq/formfunction-program-shared";
import { Connection, Keypair } from "@solana/web3.js";

export default async function fundPayerKeypair(
  connection: Connection,
  environment: Environment,
  payer: Keypair
): Promise<void> {
  switch (environment) {
    case Environment.Local:
    case Environment.Testnet:
    case Environment.Development:
      await requestAirdrops({
        connection,
        environment,
        wallets: [payer],
      });
      return;
    case Environment.Production: {
      const balance = await connection.getBalance(payer.publicKey);
      if (balance === 0) {
        throw new Error(
          `Payer keypair with address ${payer.publicKey} has 0 SOL. Please fund the account first.`
        );
      }
      return;
    }
    default: {
      return assertUnreachable(environment);
    }
  }
}
