import { logIfDebug } from "@formfunction-hq/formfunction-program-shared";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import AuctionHouseOverrideForTest from "address-lookup-table/types/AuctionHouseOverrideForTest";
import extendAddressLookupTableForTest from "address-lookup-table/utils/extendAddressLookupTableForTest";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import {
  FEE_WITHDRAWAL_DESTINATION,
  TREASURY_WITHDRAWAL_DESTINATION_OWNER,
} from "tests/constants/AuctionHouse";
import { ADDRESS_LOOKUP_TABLE_ADDRESS } from "tests/setup";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import invariant from "tiny-invariant";

export default async function createAuctionHouse(
  connection: Connection,
  sdk: AuctionHouseSdk,
  programCreator: Keypair,
  auctionHouseConfig: {
    basisPoints: number;
    basisPointsSecondary: number;
    feeWithdrawalDestination?: PublicKey;
    treasuryWithdrawalDestination?: PublicKey;
    treasuryWithdrawalDestinationOwner?: PublicKey;
  }
) {
  const {
    basisPoints: auctionHouseBasisPoints,
    basisPointsSecondary: auctionHouseBasisPointsSecondary,
    feeWithdrawalDestination,
    treasuryWithdrawalDestination,
    treasuryWithdrawalDestinationOwner,
  } = auctionHouseConfig;

  //
  // Create auction house
  //
  const accountInfo = await connection.getAccountInfo(sdk.auctionHouse);
  if (accountInfo != null) {
    logIfDebug(
      `auction house already created, has address ${sdk.auctionHouse.toString()}`
    );
    return sdk.auctionHouse;
  }

  logIfDebug(
    `creating auction house at address ${sdk.auctionHouse.toString()} for treasuryMint ${sdk.treasuryMint.toString()}`
  );
  const tx = await sdk.createTx(
    {
      feeWithdrawalDestination:
        feeWithdrawalDestination ?? FEE_WITHDRAWAL_DESTINATION,
      payer: programCreator.publicKey,
      treasuryWithdrawalDestination:
        treasuryWithdrawalDestination ?? TREASURY_WITHDRAWAL_DESTINATION_OWNER,
      treasuryWithdrawalDestinationOwner:
        treasuryWithdrawalDestinationOwner ??
        TREASURY_WITHDRAWAL_DESTINATION_OWNER,
    },
    {
      basisPoints: auctionHouseBasisPoints,
      basisPointsSecondary: auctionHouseBasisPointsSecondary,
      canChangePrice: false,
      payAllFees: true,
      requiresSignOff: false,
    }
  );
  await sendTransactionWithWallet(connection, tx, programCreator);

  logIfDebug(`created auction house at address ${sdk.auctionHouse.toString()}`);

  invariant(ADDRESS_LOOKUP_TABLE_ADDRESS != null);
  const overrideForTest: AuctionHouseOverrideForTest = {
    auctionHouse: sdk.auctionHouse,
    authority: sdk.walletAuthority,
    treasuryMint: sdk.treasuryMint,
  };
  await extendAddressLookupTableForTest(
    connection,
    ADDRESS_LOOKUP_TABLE_ADDRESS,
    overrideForTest
  );

  return sdk.auctionHouse;
}
