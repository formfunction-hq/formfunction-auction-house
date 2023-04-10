#!/bin/bash

# Run tests first
printf "\nRunning tests prior to devnet deployment...\n"
yarn test || { printf "\nTests failed! Please ensure tests are passing before attempting to deploy the program."; exit 1; }
printf "\nTests succeeded!\n"

# Make sure there aren't any changes that result from building and copying IDL
if [[ `git status --porcelain` ]]; then
  printf "\nBuild and test resulted in working tree changes! Aborting..."
  exit 1
fi

# Copy devnet values to Anchor.toml
cp scripts/anchor-configs/Anchor-dev.toml Anchor.toml
# Swap program id in lib.rs to devnet program ID
sed -i '' "s/formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC/devmBQyHHBPiLcuCqbWWRYxCG33ntAfPD5nXZeLd4eX/" programs/formfn-auction-house/src/lib.rs

printf "\nBuilding devnet program...\n"
# Build devnet program
anchor build
printf "\nBuild finished!\n"
read -p "Enter y/Y to confirm and proceed with the devnet program deployment: " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  # Deploy program to devnet
  printf "\nConfirmed. Calling solana program deploy ./target/deploy/formfn_auction_house.so -u devnet -k ./keys/devnet/deployer-keypair.json --program-id ./keys/devnet/program-keypair.json\n"
  solana program deploy ./target/deploy/formfn_auction_house.so -u devnet -k ./keys/devnet/deployer-keypair.json --program-id ./keys/devnet/program-keypair.json
fi

printf "Don't forget to update the Program Versions document with the new deployed program version!\n"

# Swap program id back
sed -i '' "s/devmBQyHHBPiLcuCqbWWRYxCG33ntAfPD5nXZeLd4eX/formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC/" programs/formfn-auction-house/src/lib.rs
# Restore Anchor.toml
cp scripts/anchor-configs/Anchor-prod.toml Anchor.toml
