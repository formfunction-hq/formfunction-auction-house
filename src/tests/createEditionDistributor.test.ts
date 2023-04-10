import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import getEditionDistributorSetup from "tests/utils/getEditionDistributorSetup";
import PriceFunctionType from "types/enum/PriceFunctionType";

describe("create edition distributor tests", () => {
  it("create no params", async () => {
    await getEditionDistributorSetup({
      priceFunctionType: PriceFunctionType.Constant,
      priceParams: [],
      startingPriceLamports: LAMPORTS_PER_SOL,
    });
  });

  it("create single param", async () => {
    await getEditionDistributorSetup({
      priceFunctionType: PriceFunctionType.Linear,
      priceParams: [5],
      startingPriceLamports: LAMPORTS_PER_SOL,
    });
  });
});
