import { PublicKey } from "@solana/web3.js";

export default function expectEqPubkeys(
  pubkey1: PublicKey,
  pubkey2: PublicKey
) {
  expect(pubkey1.toString()).toEqual(pubkey2.toString());
}
