import {
  createAtaIfNotExists,
  logIfDebug,
  mintTo,
} from "@formfunction-hq/formfunction-program-shared";
import { Connection, Keypair } from "@solana/web3.js";
import { SPL_TOKEN_DECIMALS } from "tests/constants/AuctionHouse";
import { WALLET_SPL_TOKEN_MINT_AUTHORITY } from "tests/constants/Wallets";
import { IS_NATIVE } from "tests/setup";
import getTreasuryMint from "tests/utils/getTreasuryMint";

export default async function fundSplTokenAtas(
  connection: Connection,
  wallets: Array<Keypair>
): Promise<void> {
  if (IS_NATIVE) {
    return;
  }

  const treasuryMint = await getTreasuryMint();

  await Promise.all(
    wallets.map(async (wallet) => {
      const ata = await createAtaIfNotExists(
        connection,
        wallet.publicKey,
        treasuryMint,
        wallet,
        "wallet"
      );
      const amount = 50 * Math.pow(10, SPL_TOKEN_DECIMALS);
      await mintTo(
        connection,
        treasuryMint,
        ata,
        WALLET_SPL_TOKEN_MINT_AUTHORITY.publicKey,
        [WALLET_SPL_TOKEN_MINT_AUTHORITY],
        amount
      );
      const tokenAccountBalance = await connection.getTokenAccountBalance(ata);
      const tokenAmount = tokenAccountBalance.value.amount;
      logIfDebug(
        `Funded ${wallet.publicKey.toString()} with ${amount} SPL token(s), current SPL token balance = ${tokenAmount}`
      );
    })
  );
}
