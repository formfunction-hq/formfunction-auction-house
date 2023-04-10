import { IDL as AUCTION_HOUSE_IDL } from "idl/AuctionHouse";

const INSTRUCTION_NAMES = AUCTION_HOUSE_IDL.instructions.map((ix) => ix.name);

type AuctionHouseInstructionName = typeof INSTRUCTION_NAMES[0];

export default AuctionHouseInstructionName;
