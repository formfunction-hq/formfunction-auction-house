import { requestAirdrops } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import readAddressLookupTableFromDisk from "address-lookup-table/utils/readAddressLookupTableFromDisk";
import {
  WALLET_CREATOR,
  WALLET_SPL_TOKEN_MINT_AUTHORITY,
} from "tests/constants/Wallets";
import createAuctionHouseHelper from "tests/utils/createAuctionHouseHelper";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getProgram from "tests/utils/getProgram";

export const DEBUG = process.env.DEBUG === "true";
export const IS_NATIVE = process.env.SPL_TOKEN == null;
export const LOG_TX_SIZE = process.env.LOG_TX_SIZE == "true";

const UNIT_TESTS = process.env.UNIT_TESTS == "true";

// This file should have been created up front before the tests run, when the
// ALT was created. Note that if running unit tests this file will not exist,
// so this will default to the PublicKey default value.
export const ADDRESS_LOOKUP_TABLE_ADDRESS: PublicKey = UNIT_TESTS
  ? PublicKey.default
  : readAddressLookupTableFromDisk(
      process.env.ADDRESS_LOOKUP_TABLE_FILE as string
    );

// Regular test mode suppresses all console.error output, which is noisy.
const spy = jest.spyOn(console, "error");

const connection = getConnectionForTest();

beforeAll(async () => {
  // We want to skip setup if we are just running unit tests.
  if (UNIT_TESTS) {
    return;
  }

  if (!DEBUG) {
    spy.mockImplementation(() => null);
  }

  if (DEBUG) {
    global.Promise = require("bluebird");
    console.log(
      "Running tests in DEBUG mode, tests will run serially and console.error and logIfDebug " +
        "output will be displayed. Lastly, Bluebird's Promise implementation will be used " +
        "to enable more informative stack traces"
    );
  } else {
    console.log(
      "Running tests in regular mode. Run yarn test-debug to see console.error and logIfDebug output."
    );
  }

  await requestAirdrops({
    connection,
    wallets: [WALLET_CREATOR, WALLET_SPL_TOKEN_MINT_AUTHORITY],
  });

  const programCreator = getProgram(WALLET_CREATOR);
  // By default, all formfn-auction-house-* tests will use the
  // same auction house. Thus, we create it before all tests run
  // to ensure that there aren't any weird race conditions if these
  // tests run in parallel. Some tests override this and create another
  // auction house to be used for that test.

  // We need to create the SOL auction house for SPL token tests since
  // we use the SOL auction house for last_bid_price and thus it is assumed
  // to be created.
  if (!IS_NATIVE) {
    await createAuctionHouseHelper(
      connection,
      programCreator,
      WALLET_CREATOR,
      true
    );
  }

  // Create the actual auction house.
  await createAuctionHouseHelper(connection, programCreator, WALLET_CREATOR);
});

afterAll(() => {
  if (!DEBUG) {
    spy.mockRestore();
  }
});
