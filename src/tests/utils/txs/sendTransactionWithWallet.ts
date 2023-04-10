import { estimateTransactionSizeInBytes } from "@formfunction-hq/formfunction-program-shared";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SendOptions,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { ADDRESS_LOOKUP_TABLE_ADDRESS, DEBUG, LOG_TX_SIZE } from "tests/setup";
import invariant from "tiny-invariant";

async function sendVersionedTransaction({
  connection,
  options,
  signers = [],
  tx,
  wallet,
}: {
  connection: Connection;
  options?: SendOptions;
  signers?: Array<Keypair>;
  tx: Transaction;
  wallet: Keypair;
}): Promise<string> {
  const signersList = [wallet, ...signers];

  // Treat it as a legacy transaction if no ALT address is defined yet.
  if (ADDRESS_LOOKUP_TABLE_ADDRESS == null) {
    return sendAndConfirmTransaction(connection, tx, signersList, options);
  }

  const addressLookupTable = await connection.getAddressLookupTable(
    new PublicKey(ADDRESS_LOOKUP_TABLE_ADDRESS)
  );
  invariant(addressLookupTable.value != null);

  const blockhash = await connection.getLatestBlockhash();
  const transactionMessage = new TransactionMessage({
    instructions: tx.instructions,
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash.blockhash,
  }).compileToV0Message([addressLookupTable.value]);

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign(signersList);
  const txid = await connection.sendTransaction(transaction, options);

  return txid;
}

// [TODO][@]: Refactor to take an object of arguments.
export default async function sendTransactionWithWallet(
  connection: Connection,
  tx: Transaction,
  wallet: Keypair,
  signers?: Array<Keypair>,
  options?: SendOptions
) {
  try {
    const txid = await sendVersionedTransaction({
      connection,
      options,
      signers,
      tx,
      wallet,
    });

    const blockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        signature: txid,
      },
      "confirmed"
    );

    if (LOG_TX_SIZE) {
      const size = await estimateTransactionSizeInBytes(txid, connection);
      console.log(`Estimated transaction size = ${size} bytes.`);
    }

    return txid;
  } catch (e) {
    if (DEBUG) {
      console.error(e);
    }

    throw e;
  }
}
