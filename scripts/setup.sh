#!/bin/bash

IDL=target/types/auction_house.ts
PREVIOUS_IDL=target/types/previous_auction_house.ts

# Only run if program IDL has changed.
# This is kind of ghetto but since we modify the program IDL burying the previous
# IDL in the target/ folder is the easiset way I can think of to quickly diff the
# IDL for changes.
if ! cmp --silent -- "$IDL" "$PREVIOUS_IDL"; then
  echo "Program IDL changed, running script to modify IDL and generate SDK types..."
  cp $IDL src/idl/AuctionHouse.ts
  yarn modify-program-idl
  npx eslint --cache --fix "src/idl/AuctionHouse.ts"
fi

cp $IDL $PREVIOUS_IDL