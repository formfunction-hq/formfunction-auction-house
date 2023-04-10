import { IDL as AUCTION_HOUSE_IDL } from "idl/AuctionHouse";

const ErrorCodes = AUCTION_HOUSE_IDL["errors"].map((val) => val.name);

// This is a union type of all the error code names.
type ProgramErrorName = typeof ErrorCodes[0];

export default ProgramErrorName;
