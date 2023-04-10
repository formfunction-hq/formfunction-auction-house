import fetchAndPrintAddressLookupTable from "address-lookup-table/utils/fetchAndPrintAddressLookupTable";
import getEnvironmentAndConnectionForScript from "address-lookup-table/utils/getEnvironmentAndConnectionForScript";
import handleExtendTable from "address-lookup-table/utils/handleExtendTable";
import parseScriptArgs from "address-lookup-table/utils/parseScriptArgs";
import invariant from "tiny-invariant";

async function extendTable() {
  const { tableAddress } = parseScriptArgs();
  invariant(tableAddress != null);
  const { environment, connection } = getEnvironmentAndConnectionForScript();
  await handleExtendTable(environment, connection, tableAddress);
  await fetchAndPrintAddressLookupTable(connection, tableAddress);
}

extendTable();
