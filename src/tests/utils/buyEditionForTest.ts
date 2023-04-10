import {
  expectNumbersEqual,
  getBalanceForMint,
  logIfDebug,
  Maybe,
} from "@formfunction-hq/formfunction-program-shared";
import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";
import {
  AccountMeta,
  Connection,
  Keypair,
  PublicKey,
  SendOptions,
} from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import { BASIS_POINTS_100_PERCENT } from "tests/constants/AuctionHouse";
import { IS_NATIVE } from "tests/setup";
import expectSlightlyLessThan from "tests/utils/expectSlightlyLessThan";
import getBalance from "tests/utils/getBalance";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import AuctionHouseProgram from "types/AuctionHouseProgram";
import MerkleAllowlistBuyerWithProof from "types/merkle-tree/MerkleAllowlistBuyerWithProof";

export default async function buyEditionForTest({
  auctionHouseAccount,
  auctionHouseSdk,
  buyerKeypair,
  buyerWithAllowlistProofData = null,
  connection,
  metadataData,
  nftOwner,
  price,
  proofTreeIndex = null,
  remainingAccounts,
  sendOptions,
  signers = [],
  tokenMint,
}: {
  auctionHouseAccount: Awaited<
    ReturnType<AuctionHouseProgram["account"]["auctionHouse"]["fetch"]>
  >;
  auctionHouseSdk: AuctionHouseSdk;
  buyerKeypair: Keypair;
  buyerWithAllowlistProofData?: Maybe<MerkleAllowlistBuyerWithProof>;
  connection: Connection;
  metadataData: DataV2;
  nftOwner: Keypair;
  price: number;
  proofTreeIndex?: Maybe<number>;
  remainingAccounts: Array<AccountMeta>;
  sendOptions?: SendOptions;
  signers?: Array<Keypair>;
  tokenMint: PublicKey;
}): Promise<{ newMintKeypair: Keypair; txid: string }> {
  const newMintKeypair = Keypair.generate();

  const treasuryMint = await getTreasuryMint();

  const [editionDistributor] = findEditionDistributor(
    tokenMint,
    auctionHouseSdk.program.programId
  );

  const creatorAccountBalancesBefore = await Promise.all(
    remainingAccounts.map(async ({ pubkey }) =>
      getBalance(connection, { wallet: pubkey })
    )
  );

  const [
    buyerAccountBefore,
    creatorAccountBefore,
    treasuryAccountBefore,
    editionDistributorAccountBefore,
  ] = await Promise.all([
    getBalanceForMint({
      connection,
      mint: treasuryMint,
      wallet: buyerKeypair.publicKey,
    }),
    getBalanceForMint({
      connection,
      mint: treasuryMint,
      wallet: nftOwner.publicKey,
    }),
    IS_NATIVE
      ? getBalanceForMint({
          connection,
          mint: treasuryMint,
          wallet: auctionHouseSdk.treasuryAccount,
        })
      : getBalanceForMint({
          connection,
          mint: treasuryMint,
          tokenAccount: auctionHouseSdk.treasuryAccount,
        }),
    auctionHouseSdk.program.account.editionDistributor.fetch(
      editionDistributor
    ),
  ]);

  const options = { buyerWithAllowlistProofData, priceInLamports: price };
  const accounts = {
    buyer: buyerKeypair.publicKey,
    mint: tokenMint,
    newMint: newMintKeypair.publicKey,
  };
  logIfDebug(
    `Buying edition for address ${buyerKeypair.publicKey.toString()}${
      buyerWithAllowlistProofData != null ? " with allowlist proof" : ""
    }${
      proofTreeIndex != null ? ` for proof tree index = ${proofTreeIndex}` : ""
    }`
  );

  const tx = await auctionHouseSdk.buyEditionV2Tx(
    accounts,
    options,
    remainingAccounts
  );

  const txSigners = signers.concat(newMintKeypair);
  const txid = await sendTransactionWithWallet(
    connection,
    tx,
    buyerKeypair,
    txSigners,
    sendOptions
  );

  // If skipPreflight: true is provided the caller expects the transaction
  // to fail so we want to short circuit to skip the normal balance checks below.
  const isTransactionExpectedToFail =
    sendOptions != null && sendOptions.skipPreflight;

  if (isTransactionExpectedToFail) {
    return { newMintKeypair, txid };
  }

  const creatorAccountBalancesAfter = await Promise.all(
    remainingAccounts.map(async ({ pubkey }) =>
      getBalance(connection, { wallet: pubkey })
    )
  );

  const [
    buyerAccountAfter,
    creatorAccountAfter,
    treasuryAccountAfter,
    editionDistributorAccountAfter,
  ] = await Promise.all([
    getBalanceForMint({
      connection,
      mint: treasuryMint,
      wallet: buyerKeypair.publicKey,
    }),
    getBalanceForMint({
      connection,
      mint: treasuryMint,
      wallet: nftOwner.publicKey,
    }),
    IS_NATIVE
      ? getBalanceForMint({
          connection,
          mint: treasuryMint,
          wallet: auctionHouseSdk.treasuryAccount,
        })
      : getBalanceForMint({
          connection,
          mint: treasuryMint,
          tokenAccount: auctionHouseSdk.treasuryAccount,
        }),
    auctionHouseSdk.program.account.editionDistributor.fetch(
      editionDistributor
    ),
  ]);

  const fees =
    (price * auctionHouseAccount.sellerFeeBasisPoints) /
    BASIS_POINTS_100_PERCENT;

  if (IS_NATIVE) {
    expectSlightlyLessThan(buyerAccountAfter, buyerAccountBefore - price);
    expect(treasuryAccountAfter - treasuryAccountBefore).toEqual(fees);
  } else {
    expectNumbersEqual(buyerAccountAfter, buyerAccountBefore - price);
    expect(treasuryAccountAfter - treasuryAccountBefore).toEqual(fees);
  }

  if (remainingAccounts.length > 0) {
    creatorAccountBalancesAfter.forEach((creatorAccountBalanceAfter, index) => {
      // May be null if account had 0 lamports before the sale
      const creatorAccountBalanceBefore = creatorAccountBalancesBefore[index];
      expect(
        creatorAccountBalanceAfter - creatorAccountBalanceBefore
      ).toBeCloseTo(
        (price - fees) * (metadataData!.creators![index].share / 100)
      );
    });
  } else {
    expect(creatorAccountAfter - creatorAccountBefore).toEqual(price - fees);
  }

  // If the purchase is using an allowlist, then the allowlistNumberSold should
  // have been incremented, otherwise it should not have changed.
  if (buyerWithAllowlistProofData != null) {
    expectNumbersEqual(
      editionDistributorAccountBefore.allowlistNumberSold.toNumber() + 1,
      editionDistributorAccountAfter.allowlistNumberSold
    );
  } else {
    expectNumbersEqual(
      editionDistributorAccountBefore.allowlistNumberSold,
      editionDistributorAccountAfter.allowlistNumberSold
    );
  }

  return { newMintKeypair, txid };
}
