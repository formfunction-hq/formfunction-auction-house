import {
  AssetData,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@solana/web3.js";

// TODO[@]: Make more configurable as needed.
export default function getProgrammableNftAssetData({
  creators,
}: {
  creators: Array<{ address: PublicKey; share: number; verified: boolean }>;
}): AssetData {
  const data: AssetData = {
    collection: null,
    collectionDetails: null,
    creators,
    isMutable: true,
    name: "ProgrammableNonFungible",
    primarySaleHappened: false,
    ruleSet: null,
    sellerFeeBasisPoints: 0,
    symbol: "PNF",
    tokenStandard: TokenStandard.ProgrammableNonFungible,
    uri: "test-uri",
    uses: null,
  };

  return data;
}
