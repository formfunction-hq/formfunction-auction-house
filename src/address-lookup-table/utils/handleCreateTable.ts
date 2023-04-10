import {
  Environment,
  ixToTx,
} from "@formfunction-hq/formfunction-program-shared";
import {
  AddressLookupTableProgram,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fundPayerKeypair from "address-lookup-table/utils/fundPayerKeypair";
import getAuthorityKeypair from "address-lookup-table/utils/getAuthorityKeypair";

export default async function handleCreateTable(
  environment: Environment,
  connection: Connection
): Promise<PublicKey> {
  const slot = await connection.getSlot({ commitment: "confirmed" });
  const authorityKeypair = getAuthorityKeypair(environment);
  const authority = authorityKeypair.publicKey;
  await fundPayerKeypair(connection, environment, authorityKeypair);

  console.log(
    `Creating address lookup table in environment: ${environment} with authority: ${authority}`
  );

  const [transactionInstruction, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority,
      payer: authority,
      recentSlot: slot,
    });

  const transaction = ixToTx(transactionInstruction);
  try {
    const txid = await sendAndConfirmTransaction(connection, transaction, [
      authorityKeypair,
    ]);
    console.log("Created address lookup table:");
    console.log(`txid = ${txid}`);
    console.log(`table address = ${lookupTableAddress.toString()}`);
    return lookupTableAddress;
  } catch (err) {
    console.log(`Error running ${handleCreateTable.name}:`);
    console.log(err);
    throw err;
  }
}
