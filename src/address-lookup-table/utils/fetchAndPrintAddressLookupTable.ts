import { jsonStringify } from "@formfunction-hq/formfunction-program-shared";
import { Connection, PublicKey } from "@solana/web3.js";

export default async function fetchAndPrintAddressLookupTable(
  connection: Connection,
  tableAddress: PublicKey
): Promise<void> {
  const table = await connection.getAddressLookupTable(tableAddress);
  console.log("\nLookup Table:");
  console.log(JSON.parse(jsonStringify(table)));

  const addresses = table.value?.state.addresses;
  if (addresses != null && addresses.length > 0) {
    console.log(`\nLookup Table Addresses (${addresses.length} total):`);
    console.log(addresses.map((val) => val.toString()));
  }
}
