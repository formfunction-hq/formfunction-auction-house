import { findAtaPda } from "@formfunction-hq/formfunction-program-shared";
import { Connection, PublicKey } from "@solana/web3.js";
import { IS_NATIVE } from "tests/setup";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import invariant from "tiny-invariant";

// Used to get either SOL balance or SPL token balance
// depending on which treasury mint is used.
//
// NOTE: DO NOT use for querying NFT token balance
export default async function getBalance(
  connection: Connection,
  query: { account?: PublicKey; wallet?: PublicKey },
  isNativeOverride?: boolean
): Promise<number> {
  const { account, wallet } = query;
  invariant(
    (account != null && wallet == null) || (wallet != null && account == null),
    "Only one of account or wallet must be non-null"
  );

  if (IS_NATIVE || isNativeOverride === true) {
    return connection.getBalance((account ?? wallet)!);
  }

  const tokenAccount =
    account ?? findAtaPda(wallet!, await getTreasuryMint())[0];
  let tokenAccountBalance;
  try {
    tokenAccountBalance = await connection.getTokenAccountBalance(tokenAccount);
  } catch {
    // In cases where the account is not initialized yet, return 0
    return 0;
  }

  return Number(tokenAccountBalance.value.amount);
}
