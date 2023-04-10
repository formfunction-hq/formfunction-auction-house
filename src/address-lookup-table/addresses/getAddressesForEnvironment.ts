import { Environment } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import getAuctionHouseAddressesForEnvironment from "address-lookup-table/addresses/getAuctionHouseAddressesForEnvironment";
import getSolanaAddresses from "address-lookup-table/addresses/getSolanaAddresses";
import getThirdPartyAddresses from "address-lookup-table/addresses/getThirdPartyAddresses";
import AuctionHouseOverrideForTest from "address-lookup-table/types/AuctionHouseOverrideForTest";

export default async function getAddressesForEnvironment(
  environment: Environment,
  auctionHouseOverrideForTest?: AuctionHouseOverrideForTest
): Promise<Array<PublicKey>> {
  const allAddresses = [
    ...getSolanaAddresses(),
    ...getThirdPartyAddresses(),
    ...(await getAuctionHouseAddressesForEnvironment(
      environment,
      auctionHouseOverrideForTest
    )),
  ];

  const uniqueSet: Set<string> = new Set(
    allAddresses.map((val) => val.toString())
  );

  const uniquePublicKeyAddressList = Array.from(uniqueSet).map(
    (val) => new PublicKey(val)
  );

  return uniquePublicKeyAddressList;
}
