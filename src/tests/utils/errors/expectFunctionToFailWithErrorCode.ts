import { Maybe } from "@formfunction-hq/formfunction-program-shared";
import {
  ACCOUNT_IS_FROZEN,
  CONSTRAINT_HAS_ONE,
  CONSTRAINT_SEEDS,
  EDITION_NUMBER_GREATER_THAN_MAX_SUPPLY,
  MISSING_ACCOUNT,
  SIGNATURE_VERIFICATION_FAILED,
} from "tests/constants/GeneralProgramError";
import ProgramTransactionError from "tests/constants/ProgramTransactionError";
import errorCodeToHexString from "tests/utils/errors/errorCodeToHexString";
import getErrorCodeFromErrorName from "tests/utils/errors/getErrorCodeFromErrorName";
import getErrorMatcherForGeneralProgramError from "tests/utils/errors/getErrorMatcherForGeneralProgramError";

export default async function expectFunctionToFailWithErrorCode({
  errorName,
  fn,
}: {
  errorName: ProgramTransactionError;
  fn: (...args: any) => Promise<any>;
}): Promise<void> {
  let originalError: Maybe<any> = null;

  const tryCatchWrapper = async () => {
    try {
      await fn();
    } catch (e) {
      originalError = e;
      throw e;
    }
  };

  try {
    switch (errorName) {
      case SIGNATURE_VERIFICATION_FAILED:
      case CONSTRAINT_SEEDS:
      case CONSTRAINT_HAS_ONE:
      case MISSING_ACCOUNT:
      case ACCOUNT_IS_FROZEN:
      case EDITION_NUMBER_GREATER_THAN_MAX_SUPPLY: {
        await expect(tryCatchWrapper()).rejects.toThrow(
          getErrorMatcherForGeneralProgramError(errorName)
        );
        break;
      }
      default: {
        const errorCode = getErrorCodeFromErrorName(errorName);
        await expect(tryCatchWrapper()).rejects.toThrow(
          errorCodeToHexString(errorCode)
        );
      }
    }
  } catch (err) {
    /**
     * If this catch block runs it means either the transaction did not fail
     * or the rejects.toThrow assertion failed, which probably means the
     * transaction failed in an unexpected way. If either happens we log
     * additional debugging info here.
     */
    if (originalError == null) {
      console.log(
        `Expected function to fail with error "${errorName}" but it did not fail.`
      );
    } else {
      console.log(
        `Received unexpected error in ${expectFunctionToFailWithErrorCode.name} when expecting a failure with errorName "${errorName}", original error:`
      );
      console.log(originalError);
    }

    throw err;
  }
}
