import { PublicKey } from "@solana/web3.js";
import AddressLookupTableFileData from "address-lookup-table/types/AddressLookupTableFileData";
import { writeFileSync } from "fs";

export default function writeTableAddressToDisk(
  tableAddress: PublicKey,
  filepath: string
): void {
  const data: AddressLookupTableFileData = {
    tableAddress: tableAddress.toString(),
  };
  writeFileSync(filepath, JSON.stringify(data), "utf-8");
}
