import { AssetData, CreateArgs } from "@metaplex-foundation/mpl-token-metadata";

export default function getProgrammableNftCreateArgs({
  assetData,
  printSupply,
}: {
  assetData: AssetData;
  printSupply: number;
}): CreateArgs {
  const args: CreateArgs = {
    __kind: "V1",
    assetData,
    decimals: 0,
    printSupply:
      printSupply == 0
        ? { __kind: "Zero" }
        : { __kind: "Limited", fields: [printSupply] },
  };

  return args;
}
