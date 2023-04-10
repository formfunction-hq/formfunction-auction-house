import { IDL as AUCTION_HOUSE_IDL } from "idl/AuctionHouse";
import ProgramErrorName from "tests/constants/ProgramErrorName";

export default function getErrorCodeFromErrorName(
  errorName: ProgramErrorName
): number {
  const errors = AUCTION_HOUSE_IDL["errors"];
  const idlError = errors.find((error) => error.name === errorName);
  if (idlError == null) {
    throw new Error(`Couldn't find ${errorName} in IDL errors.`);
  }

  return idlError.code;
}
