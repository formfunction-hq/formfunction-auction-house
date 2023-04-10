import { requestAirdrops } from "@formfunction-hq/formfunction-program-shared";
import { Connection, Keypair } from "@solana/web3.js";

export default async function getTestWallets(
  connection: Connection,
  numberToGenerate = 10
) {
  const wallets = new Array(numberToGenerate)
    .fill(null)
    .map(() => Keypair.generate());

  await requestAirdrops({ connection, wallets });

  return wallets;
}
