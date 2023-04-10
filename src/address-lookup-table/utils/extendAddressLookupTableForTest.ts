import {
  Environment,
  sleep,
} from "@formfunction-hq/formfunction-program-shared";
import { Connection, PublicKey } from "@solana/web3.js";
import AuctionHouseOverrideForTest from "address-lookup-table/types/AuctionHouseOverrideForTest";
import handleExtendTable from "address-lookup-table/utils/handleExtendTable";

export default async function extendAddressLookupTableForTest(
  connection: Connection,
  tableAddress: PublicKey,
  auctionHouseOverridesForTest: AuctionHouseOverrideForTest
): Promise<PublicKey> {
  const environment = Environment.Local;
  await handleExtendTable(
    environment,
    connection,
    tableAddress,
    auctionHouseOverridesForTest
  );

  // See this: https://solana.stackexchange.com/questions/2896/what-does-transaction-address-table-lookup-uses-an-invalid-index-mean
  await sleep(2);

  return tableAddress;
}
