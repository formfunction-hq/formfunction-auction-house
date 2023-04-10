# Address Lookup Table

This folder contains some utils for creating and managing [address lookup tables](https://edge.docs.solana.com/developing/lookup-tables).

See the [design doc for more details](https://www.notion.so/formfunction/Design-Doc-Address-Lookup-Tables-e038d49ff7ff4d1da2eda668bdfbcfb3).

To run the scripts, from the repo top level run the following commands:

```sh
# Create a new address lookup table.
$ yarn create-address-lookup-table --environment local|testnet|devnet|mainnet

# Fetch and display an existing table.
$ yarn print-address-lookup-table --environment local|testnet|devnet|mainnet --tableAddress <address>

# Extend an address lookup table.
# This will ensure all of the addresses in address-lookup-table/addresses are stored
# in the table with the provided tableAddress.
$ yarn extend-address-lookup-table --environment local|testnet|devnet|mainnet --tableAddress <address>
```

> Note: To run the scripts on mainnet you will need to provide a funded mainnet keypair and configure this in `getAuthorityKeypair.ts`.

## Local Testing

If you want to quickly go through the workflow to create and extend a table using a local validator, run these commands:

```sh
# Start a validator.
$ solana-test-validator

# Create an address lookup table.
$ yarn create-address-lookup-table --environment local

# Extend the table, passing in the table address from the above command.
$ yarn extend-address-lookup-table --environment local --tableAddress <address>
```

## Deployed Tables

Here are the current deployed address lookup tables:

| Network | Table Address                                  | Authority                                      |
| ------- | ---------------------------------------------- | ---------------------------------------------- |
| Testnet | `6cqjCGDNpwqf2Uz1QW9SCiusDRBsCymB8WVLkfbombHu` | `9bjwgN2WehAfAtUL7N7zxG9Lp8jSVaqgF5VH45wjQTTq` |
| Devnet  | `GLeSXHPHPeQ4JizrA6eCBGJGqLb34DnDUYcdhVfkqpAV` | `AhZXVaK9E5wrPY6NJZ3KJN6aWo9WVY6ZmjiBZAWYThr1` |
| Mainnet | `7CTJMVhehAXpzEMgmfSVoiCwtLFchECGEUGRnSEkNzk2` | ???                                            |

View the tables:

```sh
# Testnet:
$ yarn print-address-lookup-table --environment testnet --tableAddress 6cqjCGDNpwqf2Uz1QW9SCiusDRBsCymB8WVLkfbombHu

# Devnet:
$ yarn print-address-lookup-table --environment devnet --tableAddress GLeSXHPHPeQ4JizrA6eCBGJGqLb34DnDUYcdhVfkqpAV

# Mainnet:
$ yarn print-address-lookup-table --environment mainnet --tableAddress 7CTJMVhehAXpzEMgmfSVoiCwtLFchECGEUGRnSEkNzk2
```
