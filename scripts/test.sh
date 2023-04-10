#!/bin/bash

# Export this, to be used by the next script.
export TESTS_TO_RUN=$1

# Build and copy IDL first using prod values
yarn build-program

cp scripts/anchor-configs/Anchor-local.toml Anchor.toml

# Swap program id in lib.rs
sed -i '' "s/formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC/Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS/" programs/formfn-auction-house/src/lib.rs

# Anchor test will then execute the run-tests.sh script.
anchor test

# Swap program id back
sed -i '' "s/Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS/formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC/" programs/formfn-auction-house/src/lib.rs
cp scripts/anchor-configs/Anchor-prod.toml Anchor.toml
