import {
  chunkArray,
  Environment,
  forEachAsync,
  ixToTx,
} from "@formfunction-hq/formfunction-program-shared";
import {
  AddressLookupTableProgram,
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import getAddressesForEnvironment from "address-lookup-table/addresses/getAddressesForEnvironment";
import AuctionHouseOverrideForTest from "address-lookup-table/types/AuctionHouseOverrideForTest";
import fetchAndPrintAddressLookupTable from "address-lookup-table/utils/fetchAndPrintAddressLookupTable";
import fundPayerKeypair from "address-lookup-table/utils/fundPayerKeypair";
import getAuthorityKeypair from "address-lookup-table/utils/getAuthorityKeypair";
import invariant from "tiny-invariant";

export default async function handleExtendTable(
  environment: Environment,
  connection: Connection,
  tableAddress: PublicKey,
  auctionHouseOverrideForTest?: AuctionHouseOverrideForTest
): Promise<void> {
  const lookupTable = await connection.getAddressLookupTable(tableAddress);
  invariant(lookupTable.value != null);

  const currentLookupTableAddresses = new Set(
    lookupTable.value.state.addresses.map((val) => val.toString())
  );

  const addressesNotInTable = (
    await getAddressesForEnvironment(environment, auctionHouseOverrideForTest)
  ).filter((val) => !currentLookupTableAddresses.has(val.toString()));

  if (addressesNotInTable.length === 0) {
    console.log(
      "No addresses to add. Printing current table state and exiting."
    );
    await fetchAndPrintAddressLookupTable(connection, tableAddress);
    return;
  }

  console.log(
    `Extending address lookup table at address ${tableAddress} with the following new addresses:`
  );
  console.log(addressesNotInTable.map((val) => val.toString()));

  const authorityKeypair = getAuthorityKeypair(environment);
  await fundPayerKeypair(connection, environment, authorityKeypair);

  // Each extendLookupTable transaction is limited to about 20 addresses or so.
  const addressChunks = chunkArray(addressesNotInTable, 20);

  await forEachAsync(addressChunks, async (addresses, index) => {
    const extendTableInstruction = AddressLookupTableProgram.extendLookupTable({
      addresses,
      authority: authorityKeypair.publicKey,
      lookupTable: tableAddress,
      payer: authorityKeypair.publicKey,
    });

    const transaction = ixToTx(extendTableInstruction);

    try {
      const txid = await sendAndConfirmTransaction(connection, transaction, [
        authorityKeypair,
      ]);
      console.log(`extendLookupTable txid #${index + 1} = ${txid}`);
    } catch (err) {
      console.log(`Error in ${handleExtendTable.name}:`);
      console.log(err);
      throw err;
    }
  });
}
