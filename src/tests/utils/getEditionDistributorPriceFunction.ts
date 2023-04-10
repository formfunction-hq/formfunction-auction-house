import { PublicKey } from "@solana/web3.js";
import deserializePriceFunctionType from "solana/utils/deserializePriceFunctionType";
import AuctionHouseProgram from "types/AuctionHouseProgram";
import PriceFunctionType from "types/enum/PriceFunctionType";

export default async function getEditionDistributorPriceFunction(
  program: AuctionHouseProgram,
  editionDistributor: PublicKey
): Promise<{
  params: Array<number>;
  priceFunctionType: PriceFunctionType;
  startingPriceLamports: number;
}> {
  const editionDistributorAccount =
    await program.account.editionDistributor.fetch(editionDistributor);

  return {
    params: editionDistributorAccount.priceFunction.params,
    priceFunctionType: deserializePriceFunctionType(
      editionDistributorAccount.priceFunction.priceFunctionType
    ),
    startingPriceLamports:
      editionDistributorAccount.priceFunction.startingPriceLamports.toNumber(),
  };
}
