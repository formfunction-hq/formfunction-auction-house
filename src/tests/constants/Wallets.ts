import { Keypair } from "@solana/web3.js";

export const WALLET_BUYER = Keypair.generate();
export const WALLET_SELLER = Keypair.generate();
// BR4hwUuuwk3WBnQ9ENEbNnGoiDiup7nWgVM24cAg8xMR
export const WALLET_CREATOR = Keypair.fromSecretKey(
  Uint8Array.from([
    149, 171, 65, 145, 137, 246, 15, 67, 77, 137, 8, 186, 171, 154, 63, 158,
    173, 148, 6, 114, 123, 219, 133, 121, 16, 67, 82, 174, 112, 140, 131, 59,
    154, 190, 255, 183, 231, 94, 23, 233, 106, 59, 37, 170, 155, 125, 150, 112,
    115, 197, 142, 233, 199, 123, 187, 200, 203, 176, 171, 44, 200, 224, 73,
    196,
  ])
);
export const WALLET_SPL_TOKEN_MINT_AUTHORITY = Keypair.generate();
