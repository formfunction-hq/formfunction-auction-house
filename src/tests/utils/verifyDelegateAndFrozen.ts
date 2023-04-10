import { getTokenAccountInfo } from "@formfunction-hq/formfunction-program-shared";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import findAuctionHouseProgramAsSigner from "solana/pdas/findAuctionHouseProgramAsSigner";
import expectEqPubkeys from "tests/utils/expectEqPubkeys";
import expectNeqPubkeys from "tests/utils/expectNeqPubkeys";

export default async function verifyDelegateAndFrozen(
  connection: Connection,
  tokenMint: PublicKey,
  tokenAccount: PublicKey,
  wallet: Keypair,
  auctionHouseProgramId: PublicKey,
  expectedIsFrozen: boolean,
  expectedDelegate?: PublicKey
) {
  const [programAsSigner, _programAsSignerBump] =
    findAuctionHouseProgramAsSigner(auctionHouseProgramId);
  // Check that token account delegate is no longer program as signer
  const tokenAccountInfoAfter = await getTokenAccountInfo(
    connection,
    tokenAccount
  );
  expectedDelegate
    ? expectEqPubkeys(tokenAccountInfoAfter.delegate!, expectedDelegate)
    : expectNeqPubkeys(tokenAccountInfoAfter.delegate, programAsSigner);
  expect(tokenAccountInfoAfter.isFrozen).toEqual(expectedIsFrozen);
}
