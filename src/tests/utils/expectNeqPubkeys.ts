import { Maybe } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";

export default function expectNeqPubkeys(
  pubkey1: Maybe<PublicKey>,
  pubkey2: Maybe<PublicKey>
) {
  expect(pubkey1?.toString()).not.toEqual(pubkey2?.toString());
}
