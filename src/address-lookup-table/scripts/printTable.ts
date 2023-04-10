import fetchAndPrintAddressLookupTable from "address-lookup-table/utils/fetchAndPrintAddressLookupTable";
import getEnvironmentAndConnectionForScript from "address-lookup-table/utils/getEnvironmentAndConnectionForScript";
import parseScriptArgs from "address-lookup-table/utils/parseScriptArgs";
import invariant from "tiny-invariant";

async function printTable() {
  const { tableAddress } = parseScriptArgs();
  invariant(tableAddress != null);
  const { connection } = getEnvironmentAndConnectionForScript();
  await fetchAndPrintAddressLookupTable(connection, tableAddress);
}

printTable();
