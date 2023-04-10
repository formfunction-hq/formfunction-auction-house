import {
  ConfirmOptions,
  Connection,
  sendAndConfirmTransaction,
  Signer,
  Transaction,
} from "@solana/web3.js";
import ProgramTransactionError from "tests/constants/ProgramTransactionError";
import expectFunctionToFailWithErrorCode from "tests/utils/errors/expectFunctionToFailWithErrorCode";

/**
 * A wrapper around expectFunctionToFailWithErrorCode which expects a transaction,
 * rather than an arbitrary function, to fail with a specific program error code.
 */
export default async function expectTransactionToFailWithErrorCode({
  connection,
  errorName,
  options,
  signers,
  transaction,
}: {
  connection: Connection;
  errorName: ProgramTransactionError;
  options?: ConfirmOptions;
  signers: Array<Signer>;
  transaction: Transaction;
}): Promise<void> {
  await expectFunctionToFailWithErrorCode({
    errorName,
    fn: () =>
      sendAndConfirmTransaction(connection, transaction, signers, options),
  });
}
