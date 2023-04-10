import { logIfDebug } from "@formfunction-hq/formfunction-program-shared";
import { Connection, PublicKey } from "@solana/web3.js";
import { writeFileSync } from "fs";
import findNftTxs from "tests/utils/txs/findNftTxs";

export default async function getNftTxs(
  connection: Connection,
  tokenMint: PublicKey,
  waitMs?: number,
  parsedTxsOutput?: string
) {
  if (waitMs != null) {
    logIfDebug("waiting...");
    await new Promise<void>((resolve) => setTimeout(() => resolve(), waitMs));
  }

  const txs = await connection.getConfirmedSignaturesForAddress2(
    tokenMint,
    undefined,
    "confirmed"
  );

  const signatures = txs.map((tx) => tx.signature);

  const parsedTxs = await connection.getParsedTransactions(signatures, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (parsedTxsOutput != null) {
    logIfDebug(
      `found ${parsedTxs.length} txs for mint ${tokenMint.toString()}`
    );
    const filename = `test-txs-json/${parsedTxsOutput}`;
    writeFileSync(filename, JSON.stringify(parsedTxs, null, 2));
  }

  return findNftTxs(parsedTxs, signatures, tokenMint);
}
