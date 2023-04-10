import {
  findAtaPda,
  flat,
  isMintNative,
  Undef,
} from "@formfunction-hq/formfunction-program-shared";
import { AccountMeta, PublicKey } from "@solana/web3.js";

export default async function getRemainingAccounts(
  remainingAccounts: Undef<Array<AccountMeta>>,
  treasuryMint: PublicKey
): Promise<Undef<Array<AccountMeta>>> {
  if (remainingAccounts == null || isMintNative(treasuryMint)) {
    return remainingAccounts;
  }

  const remainingAccountsWithTokenAccounts = await Promise.all(
    remainingAccounts.map(async (accountMeta) => [
      accountMeta,
      {
        ...accountMeta,
        // Token accounts should not be required as signers
        isSigner: false,
        pubkey: findAtaPda(accountMeta.pubkey, treasuryMint)[0],
      },
    ])
  );

  return flat(remainingAccountsWithTokenAccounts);
}
