import { IDL as AUCTION_HOUSE_IDL } from "idl/AuctionHouse";
import { AUCTION_HOUSE_IDL_WITH_DEPRECATED_INSTRUCTIONS_0 } from "idl/AuctionHouseIdlWithDeprecatedInstructions0";
import AUCTION_HOUSE_IDL_WITH_DEPRECATED_INSTRUCTIONS_1 from "idl/AuctionHouseIdlWithDeprecatedInstructions1";
import AUCTION_HOUSE_IDL_WITH_DEPRECATED_INSTRUCTIONS_2 from "idl/AuctionHouseIdlWithDeprecatedInstructions2";
import AUCTION_HOUSE_IDL_WITH_DEPRECATED_INSTRUCTIONS_3 from "idl/AuctionHouseIdlWithDeprecatedInstructions3";

// This includes older program IDLs which are now deprecated but still needed
// for legacy transaction parsing.
const AUCTION_HOUSE_PROGRAM_IDLS = [
  AUCTION_HOUSE_IDL,
  AUCTION_HOUSE_IDL_WITH_DEPRECATED_INSTRUCTIONS_3, // This is the most recently deprecated IDL.
  AUCTION_HOUSE_IDL_WITH_DEPRECATED_INSTRUCTIONS_2,
  AUCTION_HOUSE_IDL_WITH_DEPRECATED_INSTRUCTIONS_1,
  AUCTION_HOUSE_IDL_WITH_DEPRECATED_INSTRUCTIONS_0, // This is the oldest deprecated IDL.
];

export default AUCTION_HOUSE_PROGRAM_IDLS;
