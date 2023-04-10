import {
  ixsToTx,
  Maybe,
  WRAPPED_SOL_MINT,
} from "@formfunction-hq/formfunction-program-shared";
import {
  createInitializeMintInstruction,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { SPL_TOKEN_DECIMALS } from "tests/constants/AuctionHouse";
import { WALLET_SPL_TOKEN_MINT_AUTHORITY } from "tests/constants/Wallets";
import { IS_NATIVE } from "tests/setup";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";

const TREASURY_MINT = WRAPPED_SOL_MINT;

let splTokenMintKeypair: Maybe<Keypair> = null;

const connection = getConnectionForTest();

export default async function getTreasuryMint(
  isNativeOverride?: boolean
): Promise<PublicKey> {
  if (isNativeOverride === true || (isNativeOverride == null && IS_NATIVE)) {
    return TREASURY_MINT;
  }

  if (splTokenMintKeypair != null) {
    return splTokenMintKeypair.publicKey;
  }

  // Initialize if not initialized yet
  // TODO: consider factoring out into a separate method e.g., initializeTreasuryMint
  splTokenMintKeypair = Keypair.generate();
  const minRentLamports = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span
  );
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: WALLET_SPL_TOKEN_MINT_AUTHORITY.publicKey,
    lamports: minRentLamports,
    newAccountPubkey: splTokenMintKeypair.publicKey,
    programId: TOKEN_PROGRAM_ID,
    space: MintLayout.span,
  });
  const initializeMintIx = createInitializeMintInstruction(
    splTokenMintKeypair.publicKey,
    SPL_TOKEN_DECIMALS,
    WALLET_SPL_TOKEN_MINT_AUTHORITY.publicKey,
    null
  );
  await sendTransactionWithWallet(
    connection,
    ixsToTx([createAccountIx, initializeMintIx]),
    WALLET_SPL_TOKEN_MINT_AUTHORITY,
    [splTokenMintKeypair]
  );

  return splTokenMintKeypair.publicKey;
}
