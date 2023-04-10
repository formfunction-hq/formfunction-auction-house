import {
  arePublicKeysEqual,
  DecodedInstructionAccount,
  Environment,
  expectPublicKeysEqual,
  GenericDecodedTransaction,
  uppercaseFirstLetter,
} from "@formfunction-hq/formfunction-program-shared";
import { Connection, PublicKey } from "@solana/web3.js";
import getAuctionHouseProgramIdForEnvironment from "address-lookup-table/addresses/auction-house/getAuctionHouseProgramIdForEnvironment";
import getRpcFromEnvironment from "address-lookup-table/utils/getRpcFromEnvironment";
import { IDL as AUCTION_HOUSE_IDL } from "idl/AuctionHouse";
import TEST_MAINNET_TXIDS, {
  BUY_EDITION_V2_SET,
  CREATE_EDITION_DISTRIBUTOR_SET,
} from "tests/constants/TestMainnetTxids";
import invariant from "tiny-invariant";
import AuctionHouseInstructionName from "types/AuctionHouseInstructionName";
import DecodedAuctionHouseTransactionResult from "types/DecodedAuctionHouseTransactionResult";
import decodeAuctionHouseTransaction from "utils/decodeAuctionHouseTransaction";

const KNOWN_ACCOUNTS: Record<string, string> = {
  antiBotAuthority: "antiScHGm8NAqfpdFNYbv3c9ntY6xksvvTN3B9cDf5Y",
  ataProgram: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  metaplexTokenMetadataProgram: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  rent: "SysvarRent111111111111111111111111111111111",
  systemProgram: "11111111111111111111111111111111",
  tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
};

/**
 * Sanity check some of the decoded accounts match expected known account pubkeys.
 * This is just a rough heuristic for checking the decoded instruction accounts
 * because the names in KNOWN_ACCOUNTS need to match the account names used in
 * the program instructions, which are arbitrary, e.g. metaplexTokenMetadataProgram
 * could be called that or something else, like 'metadata'.
 */
function sanityCheckLabelledInstructionAccounts(
  labelledIxAccounts: Array<DecodedInstructionAccount>
): void {
  for (const account of labelledIxAccounts) {
    const knownAccount = KNOWN_ACCOUNTS[account.name];
    if (knownAccount) {
      // This is for debugging test failures.
      if (!arePublicKeysEqual(account.pubkey, new PublicKey(knownAccount))) {
        console.error(
          `PublicKey mismatch: account pubkey = ${account.pubkey} but expected known account ${account.name} key ${knownAccount}`
        );
      }

      expectPublicKeysEqual(account.pubkey, new PublicKey(knownAccount));
    }
  }
}

function expectInstructionDataFieldsToBeDefined(
  fields: Array<string>,
  data: Record<string, any>
) {
  fields.forEach((field) => {
    if (!(field in data)) {
      // This is for debugging test failures.
      console.error(
        `Didn't find field ${field} in ix data: ${JSON.stringify(data)}`
      );
    }

    expect(data[field]).toBeDefined();
  });
}

function expectInstructionLogMessageToExist(
  logs: Array<string>,
  instructionName: AuctionHouseInstructionName
) {
  expect(
    logs.find((log) =>
      log.includes(`Instruction: ${uppercaseFirstLetter(instructionName)}`)
    )
  ).toBeDefined();
}

function expectDecodedInstructionToBeValid<
  InstructionAccountMap extends Record<string, DecodedInstructionAccount>
>(
  decodedInstruction: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: InstructionAccountMap;
  },
  instructionName: AuctionHouseInstructionName
) {
  expect(decodedInstruction.name).toBe(instructionName);
  sanityCheckLabelledInstructionAccounts(
    Object.values(decodedInstruction.accountsMap)
  );
  expectInstructionLogMessageToExist(decodedInstruction?.logs, instructionName);
}

async function handleDecodeTransaction(
  connection: Connection,
  txid: string
): Promise<DecodedAuctionHouseTransactionResult> {
  const parsedTransaction = await connection.getParsedTransaction(txid, {
    maxSupportedTransactionVersion: 0,
  });
  invariant(parsedTransaction != null, "parsedTransaction should not be null.");
  const decodedTx = decodeAuctionHouseTransaction(
    auctionHouseProgramId,
    parsedTransaction
  );

  invariant(decodedTx, "DecodedTx should not be null.");
  return decodedTx;
}

// Handle some legacy instructions where certain current IDL instruction accounts
// were not present, and therefore will not be present on the decoded instruction,
// if the transaction is a legacy transaction.
const OMITTED_LEGACY_ACCOUNTS: Record<string, Set<string>> = {
  sell: new Set(["masterEdition", "metaplexTokenMetadataProgram"]),
  updateEditionDistributor: new Set(["treasuryMint"]),
};

function expectDecodedInstructionAccountNameMapToBeValid<
  InstructionAccountMap extends Record<string, DecodedInstructionAccount>
>(
  instructionName: AuctionHouseInstructionName,
  decodedInstruction: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: InstructionAccountMap;
  }
) {
  const instruction = AUCTION_HOUSE_IDL.instructions.find(
    (ix) => ix.name === instructionName
  );
  invariant(instruction != null, "Instruction should exist");

  for (const { name } of instruction.accounts) {
    if (
      instructionName in OMITTED_LEGACY_ACCOUNTS &&
      OMITTED_LEGACY_ACCOUNTS[instructionName].has(name)
    ) {
      continue;
    }

    if (!(name in decodedInstruction.accountsMap)) {
      console.warn(
        `account "${name}" missing for instruction ${instructionName}`
      );
    }

    expect(decodedInstruction.accountsMap[name]).toBeDefined();
  }
}

const env = Environment.Production;
const rpc = getRpcFromEnvironment(env); // NOTE: Switch to Quicknode if needed.
const connection = new Connection(rpc, "confirmed");
const auctionHouseProgramId = getAuctionHouseProgramIdForEnvironment(env);

// Note: This is skipped by default because it's just for testing the transaction
// parsing code and also slams mainnet RPCs to get parsed transactions. Unskip it
// if you need to run these tests for some reason.
describe.skip("Test decodeAuctionHouseTransaction", () => {
  test.each(TEST_MAINNET_TXIDS.SELL_OLD)(
    "Decode legacy Sell txid (%s)",
    async (txid) => {
      const decodedTx = await handleDecodeTransaction(connection, txid);

      const expectedIxName: AuctionHouseInstructionName = "sell";
      const decodedIx = decodedTx[expectedIxName];
      invariant(decodedIx != null, "decodedIx should not be null.");

      expectDecodedInstructionToBeValid(decodedIx, expectedIxName);

      expectInstructionDataFieldsToBeDefined(
        [
          "tradeStateBump",
          "freeTradeStateBump",
          "programAsSignerBump",
          "buyerPrice",
          "tokenSize",
        ],
        decodedIx.data
      );

      expectDecodedInstructionAccountNameMapToBeValid(
        expectedIxName,
        decodedIx
      );
    }
  );

  test.each([
    ...TEST_MAINNET_TXIDS.BUY_EDITION_V2_OLD,
    ...TEST_MAINNET_TXIDS.BUY_EDITION_V2,
  ])("Decode BuyEditionV2 txid (%s)", async (txid) => {
    const decodedTx = await handleDecodeTransaction(connection, txid);

    const expectedIxName: AuctionHouseInstructionName = "buyEditionV2";
    const decodedIx = decodedTx[expectedIxName];
    invariant(decodedIx != null, "decodedIx should not be null.");

    expectDecodedInstructionToBeValid(decodedIx, expectedIxName);

    expectInstructionDataFieldsToBeDefined(
      [
        "editionBump",
        "requestedEditionNumber",
        "priceInLamports",
        "buyerEditionInfoAccountBump",
      ],
      decodedIx.data
    );

    // Only recent transactions include the allowlist info, and will match the
    // expected instruction accounts in the most recent IDL.
    if (BUY_EDITION_V2_SET.has(txid)) {
      expect(decodedIx.data.buyerMerkleAllowlistProofData).toBeDefined();
      expectDecodedInstructionAccountNameMapToBeValid(
        expectedIxName,
        decodedIx
      );
    } else {
      expect(decodedIx.data.buyerMerkleAllowlistProofData).not.toBeDefined();
    }

    expect(
      decodedIx?.logs.find((log) =>
        /Bought edition #(.*) for mint (.*)/.test(log)
      )
    ).toBeDefined();
  });

  test.each(TEST_MAINNET_TXIDS.EXECUTE_SALE_V2)(
    "Decode ExecuteSaleV2 txid (%s)",
    async (txid) => {
      const decodedTx = await handleDecodeTransaction(connection, txid);

      const expectedIxName: AuctionHouseInstructionName = "executeSaleV2";
      const decodedIx = decodedTx[expectedIxName];
      invariant(decodedIx != null, "decodedIx should not be null.");

      expectDecodedInstructionToBeValid(decodedIx, expectedIxName);
      expectDecodedInstructionAccountNameMapToBeValid(
        expectedIxName,
        decodedIx
      );

      expectInstructionDataFieldsToBeDefined(
        [
          "escrowPaymentBump",
          "freeTradeStateBump",
          "programAsSignerBump",
          "buyerPrice",
          "sellerPrice",
          "tokenSize",
        ],
        decodedIx.data
      );
    }
  );

  test.each([
    ...TEST_MAINNET_TXIDS.CREATE_EDITION_DISTRIBUTOR_OLD,
    ...TEST_MAINNET_TXIDS.CREATE_EDITION_DISTRIBUTOR,
  ])("Decode CreateEditionDistributor txid (%s)", async (txid) => {
    const decodedTx = await handleDecodeTransaction(connection, txid);

    const expectedIxName: AuctionHouseInstructionName =
      "createEditionDistributor";
    const decodedIx = decodedTx[expectedIxName];
    invariant(decodedIx != null, "decodedIx should not be null.");

    expectDecodedInstructionToBeValid(decodedIx, expectedIxName);
    expectDecodedInstructionAccountNameMapToBeValid(expectedIxName, decodedIx);

    // All transactions should include these fields.
    expectInstructionDataFieldsToBeDefined(
      [
        "editionBump",
        "startingPriceLamports",
        "priceFunctionType",
        "priceParams",
      ],
      decodedIx.data
    );

    // Legacy transactions should include these other fields.
    if (!CREATE_EDITION_DISTRIBUTOR_SET.has(txid)) {
      expectInstructionDataFieldsToBeDefined(
        ["startTime", "endTime"],
        decodedIx.data
      );
    }

    // Allowlist settings should only be in the current txid set.
    if (CREATE_EDITION_DISTRIBUTOR_SET.has(txid)) {
      expectInstructionDataFieldsToBeDefined(
        [
          "allowlistSaleStartTime",
          "publicSaleStartTime",
          "saleEndTime",
          "allowlistSalePrice",
        ],
        decodedIx.data
      );
    }
  });

  test.each(TEST_MAINNET_TXIDS.UPDATE_EDITION_DISTRIBUTOR)(
    "Decode UpdateEditionDistributor txid (%s)",
    async (txid) => {
      const decodedTx = await handleDecodeTransaction(connection, txid);

      const expectedIxName: AuctionHouseInstructionName =
        "updateEditionDistributor";
      const decodedIx = decodedTx[expectedIxName];
      invariant(decodedIx != null, "decodedIx should not be null.");

      expectDecodedInstructionToBeValid(decodedIx, expectedIxName);
      expectDecodedInstructionAccountNameMapToBeValid(
        expectedIxName,
        decodedIx
      );

      expectInstructionDataFieldsToBeDefined(
        [
          "editionBump",
          "startingPriceLamports",
          "priceFunctionType",
          "priceParams",
          "newOwner",
          "startTime",
          "endTime",
        ],
        decodedIx.data
      );
    }
  );

  test.each(TEST_MAINNET_TXIDS.CLOSE_EDITION_DISTRIBUTOR_TOKEN_ACCOUNT)(
    "Decode CloseEditionDistributorTokenAccount txid (%s)",
    async (txid) => {
      const decodedTx = await handleDecodeTransaction(connection, txid);

      const expectedIxName: AuctionHouseInstructionName =
        "closeEditionDistributorTokenAccount";
      const decodedIx = decodedTx[expectedIxName];
      invariant(decodedIx != null, "decodedIx should not be null.");

      expectDecodedInstructionToBeValid(decodedIx, expectedIxName);
      expectDecodedInstructionAccountNameMapToBeValid(
        expectedIxName,
        decodedIx
      );
    }
  );
});
