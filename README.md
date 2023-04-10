![](banner.jpeg)

<div align="center">
  <h1>Formfunction Auction House</h1>
  <a href="#overview">Overview</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="#development">Development</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="#testing">Testing</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="#building">Building</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="#deploying">Deploying</a>
  <br />
  <hr />
</div>

## Overview
The Solana program and TypeScript SDK that handles on-chain marketplace transactions (e.g. bidding, buying editions) for Formfunction.

- Mainnet address: `formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC`
- Devnet address: `devmBQyHHBPiLcuCqbWWRYxCG33ntAfPD5nXZeLd4eX`

## Development

Use the same version of Anchor CLI as `.github/workflows/release-package.yml`

I.e. run `avm use 0.24.2`

### Prerequisites

- Install Rust, Solana, Anchor: https://book.anchor-lang.com/chapter_2/installation.html
  - Helpful [resources for installing on M1 Mac](https://twitter.com/friedbrioche/status/1494075962874499075)
- Install [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools#use-solanas-install-tool)


### Setup Steps

1. Run `yarn`
2. Run `yarn test`
3. Run `yarn test-cargo`

If everything is setup correctly, all tests should pass and you should have a localnet setup ready to go!

### Workflow

High-level overview:
* The core instruction set of the Auction House program lives in `src/lib.rs`
* The JavaScript SDK lives in `src/solana/auction-house/AuctionHouseSdk.ts`
  * The SDK interfaces with the Auction House program via clients generated from IDL produced by Anchor (see `src/types/AuctionHouseProgram.ts` and the instruction wrappers in `src/solana/auction-house/instructions` to see this in action)

An example E2E change might look like:
* Instruction is added/updated in `src/lib.rs`
* Run `yarn build-program` to generate types + JS clients
* Add/update corresponding instruction in JS SDK
* Write tests in `src/tests/formfn-auction-house.ts`
* Run `yarn test` to verify changes

### Backwards Compatibility

As we are deploying updates to a program being used in production, we must be careful to ensure that our upgrades are backwards compatible (i.e., doesn't break existing production experience).

See [this blog post](https://formfunction.medium.com/how-to-make-backwards-compatible-changes-to-a-solana-program-45015dd8ff82) for more info on program backwards compatibility.


### Tips & Troubleshooting
* **Calling into external programs in localnet**: if you are calling into external programs and you want to test this on localnet, you'll need to download the binary and specify it in `Anchor.toml`:
  * `solana program dump <program id> artifacts/deploy/<name>.so --url mainnet-beta`
  * In `Anchor.toml`: add a new `[[test.genesis]]` entry:

```toml
[[test.genesis]]
address = "<program id>"
program = "artifacts/deploy/<name>.so"
```

* **Cross-program invocation with unauthorized signer or writable account when calling `invoke_signed`**: this can be either because:
  * The signature is invalid (i.e., the current program cannot sign for the specified PDA)
  * There are accounts that were passed in that should be marked as writable but they are not
    * Sometimes the easiest way is to just check the source code of the instruction being invoked and see if the accounts are being marked as read-only or not (if not, it needs to be writable)

* **Check the tests**: sometimes the tests will no longer testing behavior that is considered valid based on your changes so it's good to verify that the test isn't fault

## Testing

Note that the tests run in parallel by default, and that an address lookup table is setup and deployed
prior to the test run. This ALT is shared across all of the tests.

```bash
# Run tests using Anchor (spins up local validator and deploys program)
$ yarn test

# Run with tests with SPL_TOKEN enabled
$ yarn test-spl

# Run tests using Anchor without silencing console.error output
$ yarn test-debug

# Run Rust unit tests with Cargo
$ yarn test-cargo

# Run Rust unit tests with Cargo with extra logging
$ yarn test-cargo-debug
```

### Run individual test suites

Run `yarn test` or `yarn test-debug` and pass in a file pattern for the test you want to run:

```sh
$ yarn test buyEditionAllowlist.test.ts
```

If you for some reason need the tests to run serially, rather than in parallel, you can run:

```sh
$ RUN_IN_BAND=true yarn test
```

If you want to log transaction sizes in the tests, you can run:

```sh
$ LOG_TX_SIZE=true yarn test
```

## Building

Run `yarn build-program`.

## Deploying

### Upgrading program (mainnet)

1. Create new binary by [pushing a new tag](#publishing-new-package-version)
2. Download new binary to computer (can't use GitHub URL because our repo is private)
3. Make sure deployer account (run `goki show` to find pubkey) has enough SOL (needs ~4 SOL)
4. Run `goki upgrade-local -c mainnet -l releases/formfn_auction_house-VERSION.so -p formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC -u usb://ledger`. Make sure the Ledger is connected
5. Sign transactions with ledger
6. Update the NPM package if necessary, and bump it wherever it's used

### Verifying releases (optional)

```
solana program dump formn3hJtt8gvVKxpCfzCJGuoz6CNUFcULFZW18iTpC deployed.so
goki pull releases/formfn_auction_house-VERSION.so 
head -c NUM_BYTES deployed.so > deployed-trimmed.so
goki pull deployed-trimmed.so
```

Compare `SHA256` hashes of the `goki pull` commands to verify the deployed release is indeed the version you expect it to be.

### Upgrading program (devnet)

From the root dir on an untouched checkout of `main`, run

```
./scripts/deploy-dev.sh
```

### Upgrading program (testnet)

From the root dir on an untouched checkout of `main`, run

```
./scripts/deploy-test.sh
```

You may need to follow this to get the deployment to work: https://stackoverflow.com/questions/70437644/error-custom-invalid-blockhash-when-solana-program-deploy/70664369#70664369


### Installing package

```
$ npm login --scope=@formfunction-hq --registry=https://npm.pkg.github..com
Username: formfunction-hq
Password: YOUR_PAT
Email: (this IS public) YOUR_EMAIL
Logged in as formfunction-hq to scope @formfunction-hq on https://npm.pkg.github.com/.
```

OR, create a `.npmrc` with the following:

```
@formfunction-hq:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_PAT
```

### Publishing new package version

1. `yarn npm version prerelease --preid=alpha`. Doing this bumps the version, and creates a new tag + commit
2. `git push origin NEW_TAG`. Doing this will push the new tag, which will cause `release-package.yml` to run and publish a new package (with the same version as the tag)
3. Note that when upgrading the client SDK in the monorepo, you need to upgrade the `frontend` `shared` and `server` packages.
