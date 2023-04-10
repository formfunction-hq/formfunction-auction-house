import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@solana/web3.js";
import { BASIS_POINTS } from "tests/constants/AuctionHouse";

export default function getTestMetadata(
  ...creators: Array<{ address: PublicKey; share: number; verified: boolean }>
): DataV2 {
  return {
    collection: null,
    creators: creators.map((creator) => ({
      address: creator.address,
      share: creator.share,
      verified: creator.verified,
    })),
    name: "test",
    sellerFeeBasisPoints: BASIS_POINTS,
    symbol: "test",
    uri: "test",
    uses: null,
  };
}
