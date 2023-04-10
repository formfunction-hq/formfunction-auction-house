import { stringToPublicKey } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import AddressLookupTableFileData from "address-lookup-table/types/AddressLookupTableFileData";
import { readFileSync } from "fs";

export default function readAddressLookupTableFromDisk(
  filepath: string
): PublicKey {
  const file = readFileSync(filepath, "utf-8");
  const data: AddressLookupTableFileData = JSON.parse(file);
  const address = stringToPublicKey(data.tableAddress);
  if (address == null) {
    throw new Error(
      `Error reading and parsing local address lookup table file data at: ${filepath}`
    );
  }

  return address;
}
