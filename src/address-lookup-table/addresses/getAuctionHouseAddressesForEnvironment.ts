import { Environment } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import getAuctionHouseAddressesForCurrency from "address-lookup-table/addresses/auction-house/getAuctionHouseAddressesForCurrency";
import AuctionHouseOverrideForTest from "address-lookup-table/types/AuctionHouseOverrideForTest";
import Currency from "address-lookup-table/types/Currency";

export default async function getAuctionHouseAddressesForEnvironment(
  environment: Environment,
  auctionHouseOverrideForTest?: AuctionHouseOverrideForTest
): Promise<Array<PublicKey>> {
  const auctionHouseAddressesAllCurrencies = await Promise.all(
    Object.values(Currency).map((currency) =>
      getAuctionHouseAddressesForCurrency(environment, currency)
    )
  );

  const auctionHouseAddressesForTest =
    await getAuctionHouseAddressesForCurrency(
      environment,
      Currency.Solana, // Will get overwritten by auctionHouseOverrideForTest.
      auctionHouseOverrideForTest
    );

  const auctionHouseAddresses = auctionHouseAddressesAllCurrencies.concat(
    auctionHouseAddressesForTest
  );
  return auctionHouseAddresses.reduce(
    (addresses, addressesForCurrency) =>
      addresses.concat(Object.values(addressesForCurrency)),
    [] as Array<PublicKey>
  );
}
