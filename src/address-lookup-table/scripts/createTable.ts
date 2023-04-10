import fetchAndPrintAddressLookupTable from "address-lookup-table/utils/fetchAndPrintAddressLookupTable";
import getEnvironmentAndConnectionForScript from "address-lookup-table/utils/getEnvironmentAndConnectionForScript";
import handleCreateTable from "address-lookup-table/utils/handleCreateTable";
import parseScriptArgs from "address-lookup-table/utils/parseScriptArgs";
import writeTableAddressToDisk from "address-lookup-table/utils/writeAddressLookupTableToDisk";

async function createTable() {
  const { connection, environment } = getEnvironmentAndConnectionForScript();
  const tableAddress = await handleCreateTable(environment, connection);
  await fetchAndPrintAddressLookupTable(connection, tableAddress);

  // Save generated table address to disk (e.g. for local program tests) if
  // flag to do so was set when this script was run.
  const { saveTableAddressFilename } = parseScriptArgs();
  if (saveTableAddressFilename != null) {
    writeTableAddressToDisk(tableAddress, saveTableAddressFilename);
  }
}

createTable();
