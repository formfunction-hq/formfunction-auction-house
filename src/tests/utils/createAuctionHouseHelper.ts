import { ANTI_BOT_DEV_AUTHORITY_KEYPAIR } from "@formfunction-hq/formfunction-program-shared";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
  TREASURY_WITHDRAWAL_DESTINATION_OWNER,
} from "tests/constants/AuctionHouse";
import createAuctionHouse from "tests/utils/createAuctionHouse";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import getTreasuryWithdrawalDestination from "tests/utils/getTreasuryWithdrawalDestination";
import AuctionHouseProgram from "types/AuctionHouseProgram";

export default async function createAuctionHouseHelper(
  connection: Connection,
  programCreator: AuctionHouseProgram,
  creatorWallet: Keypair,
  isNativeOverride?: boolean
): Promise<{ auctionHouse: PublicKey; treasuryMint: PublicKey }> {
  const treasuryMint = await getTreasuryMint(isNativeOverride);
  const auctionHouseSdk = AuctionHouseSdk.init(programCreator, {
    antiBotAuthority: ANTI_BOT_DEV_AUTHORITY_KEYPAIR.publicKey,
    treasuryMint,
    walletAuthority: creatorWallet.publicKey,
    walletCreator: creatorWallet.publicKey,
  });

  await connection.requestAirdrop(
    auctionHouseSdk.feeAccount,
    5 * LAMPORTS_PER_SOL
  );

  const { treasuryWithdrawalDestination, treasuryWithdrawalDestinationOwner } =
    await getTreasuryWithdrawalDestination(
      TREASURY_WITHDRAWAL_DESTINATION_OWNER,
      isNativeOverride
    );
  const auctionHouse = await createAuctionHouse(
    connection,
    auctionHouseSdk,
    creatorWallet,
    {
      basisPoints: BASIS_POINTS,
      basisPointsSecondary: BASIS_POINTS_SECONDARY,
      treasuryWithdrawalDestination,
      treasuryWithdrawalDestinationOwner,
    }
  );

  return { auctionHouse, treasuryMint };
}
