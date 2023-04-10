#!/bin/bash

# Run tests first
printf "\nRunning tests prior to testnet deployment...\n"
yarn test || { printf "\nTests failed! Please ensure tests are passing before attempting to deploy the program."; exit 1; }
printf "\nTests succeeded!\n"

# Make sure there aren't any changes that result from building and copying IDL
if [[ `git status --porcelain` ]]; then
  printf "\nBuild and test resulted in working tree changes! Aborting..."
  exit 1
fi

# Copy testnet values to Anchor.toml
cp scripts/anchor-configs/Anchor-test.toml Anchor.toml
# Swap program id in lib.rs to testnet program ID
sed -i '' "s/formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC/jzmdMPJhm7Txb2RzYPte6Aj1QWqFarmjsJuWjk9m2wv/" programs/formfn-auction-house/src/lib.rs

printf "\nBuilding testnet program...\n"
# Build testnet program
anchor build
printf "\nBuild finished!\n"
read -p "Enter y/Y to confirm and proceed with the testnet program deployment: " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  # Deploy program to testnet
  printf "\nConfirmed. Calling solana program deploy ./target/deploy/formfn_auction_house.so -u testnet -k ./keys/testnet/deployer-keypair.json --program-id ./keys/testnet/program-keypair.json\n"
  solana program deploy ./target/deploy/formfn_auction_house.so -u testnet -k ./keys/testnet/deployer-keypair.json --program-id ./keys/testnet/program-keypair.json
fi

printf "Don't forget to update the Program Versions document with the new deployed program version!\n"

# Swap program id back
sed -i '' "s/jzmdMPJhm7Txb2RzYPte6Aj1QWqFarmjsJuWjk9m2wv/formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC/" programs/formfn-auction-house/src/lib.rs
# Restore Anchor.toml
cp scripts/anchor-configs/Anchor-prod.toml Anchor.toml
