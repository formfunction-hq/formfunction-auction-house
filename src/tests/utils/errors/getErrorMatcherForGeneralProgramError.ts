import { assertUnreachable } from "@formfunction-hq/formfunction-program-shared";
import GeneralProgramError, {
  ACCOUNT_IS_FROZEN,
  CONSTRAINT_HAS_ONE,
  CONSTRAINT_SEEDS,
  EDITION_NUMBER_GREATER_THAN_MAX_SUPPLY,
  MISSING_ACCOUNT,
  SIGNATURE_VERIFICATION_FAILED,
} from "tests/constants/GeneralProgramError";
import errorCodeToHexString from "tests/utils/errors/errorCodeToHexString";
import errorNumberToHexString from "tests/utils/errors/errorNumberToHexString";

/**
 * Maps a general program error to the specific RegExp pattern to match the error
 * which is thrown in the test. To figure this out for some new future error,
 * run the tests in DEBUG mode and dig through the error logs.
 */
export default function getErrorMatcherForGeneralProgramError(
  generalProgramError: GeneralProgramError
): string {
  switch (generalProgramError) {
    case SIGNATURE_VERIFICATION_FAILED:
      return "Signature verification failed";
    case MISSING_ACCOUNT:
      return "An account required by the instruction is missing";
    case CONSTRAINT_HAS_ONE:
      return errorCodeToHexString(2001);
    case CONSTRAINT_SEEDS:
      return errorCodeToHexString(2006);
    case ACCOUNT_IS_FROZEN:
      return errorNumberToHexString(0x11);
    case EDITION_NUMBER_GREATER_THAN_MAX_SUPPLY:
      return errorNumberToHexString(0x7a);
    default:
      return assertUnreachable(generalProgramError);
  }
}
