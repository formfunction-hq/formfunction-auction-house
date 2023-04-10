import { Keypair } from "@solana/web3.js";

type KeypairMap = Record<string, Keypair>;

export default function createKeypairAddressMap(
  keypairs: Array<Keypair>
): KeypairMap {
  return keypairs.reduce((map, keypair) => {
    map[keypair.publicKey.toString()] = keypair;
    return map;
  }, {} as KeypairMap);
}
