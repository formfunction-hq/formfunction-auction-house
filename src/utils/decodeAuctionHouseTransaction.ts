import {
  decodeTransactionUsingProgramIdl,
  Maybe,
} from "@formfunction-hq/formfunction-program-shared";
import { ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";
import AUCTION_HOUSE_PROGRAM_IDLS from "idl/AuctionHouseProgramIdls";
import DecodedAuctionHouseTransactionResult from "types/DecodedAuctionHouseTransactionResult";

export default function decodeAuctionHouseTransaction(
  programId: PublicKey,
  parsedTransaction: ParsedTransactionWithMeta
): Maybe<DecodedAuctionHouseTransactionResult> {
  const decodedTransaction: Maybe<DecodedAuctionHouseTransactionResult> =
    AUCTION_HOUSE_PROGRAM_IDLS.map((idl) => {
      return decodeTransactionUsingProgramIdl<DecodedAuctionHouseTransactionResult>(
        idl,
        programId,
        parsedTransaction
      );
    })
      .reverse()
      .reduce((decodedResult, idlResult) => {
        return {
          ...decodedResult,
          ...(idlResult ?? {}),
        };
      }, {} as DecodedAuctionHouseTransactionResult);

  return decodedTransaction;
}
