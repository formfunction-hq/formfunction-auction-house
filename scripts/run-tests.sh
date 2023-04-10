#!/bin/bash

export ADDRESS_LOOKUP_TABLE_FILE=address-local-table-data.json

yarn create-address-lookup-table --environment local --saveTableAddressFilename $ADDRESS_LOOKUP_TABLE_FILE

echo "Saved address lookup table data to: $ADDRESS_LOOKUP_TABLE_FILE"

function runTestsDefault() {
  # Using a separate flag for this, because I don't know if it will be that helpful
  # to run the tests serially when running in debug mode.
  if [[ $RUN_IN_BAND = "true" ]]; then
    yarn jest --testPathIgnorePatterns=auctionHouseRunSeparatelyAtTheEnd.test.ts --runInBand
  else
    yarn jest --testPathIgnorePatterns=auctionHouseRunSeparatelyAtTheEnd.test.ts
  fi

  yarn jest auctionHouseRunSeparatelyAtTheEnd.test.ts
}

if [[ -z "$TESTS_TO_RUN" ]]; then
  echo "Running default test suite (all tests will run in parallel)."
  runTestsDefault
else
  echo "Running tests for custom test files: $TESTS_TO_RUN"
  yarn jest $TESTS_TO_RUN
fi

rm $ADDRESS_LOOKUP_TABLE_FILE;