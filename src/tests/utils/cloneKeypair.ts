import { Keypair } from "@solana/web3.js";

export default function cloneKeypair(kp: Keypair): Keypair {
  return Keypair.fromSecretKey(kp.secretKey);
}
