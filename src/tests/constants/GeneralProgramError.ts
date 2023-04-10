/**
 * These represent errors thrown from other programs (not our own) which we
 * still want to match against for test assertions.
 *
 * If needed these could be moved to formfn-program-shared.
 */

// Solana or Anchor program error codes
export const SIGNATURE_VERIFICATION_FAILED = "SignatureVerificationFailed";
export const CONSTRAINT_SEEDS = "ConstraintSeeds";
export const CONSTRAINT_HAS_ONE = "ConstraintHasOne";
export const MISSING_ACCOUNT = "MissingAccount";
export const ACCOUNT_IS_FROZEN = "Account is frozen";

// Metaplex program error codes
export const EDITION_NUMBER_GREATER_THAN_MAX_SUPPLY =
  "Edition Number greater than max supply";

type GeneralProgramError =
  | typeof SIGNATURE_VERIFICATION_FAILED
  | typeof CONSTRAINT_SEEDS
  | typeof CONSTRAINT_HAS_ONE
  | typeof MISSING_ACCOUNT
  | typeof ACCOUNT_IS_FROZEN
  | typeof EDITION_NUMBER_GREATER_THAN_MAX_SUPPLY;

export default GeneralProgramError;
