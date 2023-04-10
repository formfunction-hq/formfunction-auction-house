import { findAtaPda } from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import { TREASURY_WITHDRAWAL_DESTINATION_OWNER } from "tests/constants/AuctionHouse";
import { IS_NATIVE } from "tests/setup";
import getTreasuryMint from "tests/utils/getTreasuryMint";

const treasuryWithdrawalDestinationMap: { [key: string]: PublicKey } = {};

export default async function getTreasuryWithdrawalDestination(
  wallet: PublicKey = TREASURY_WITHDRAWAL_DESTINATION_OWNER,
  isNativeOverride?: boolean
): Promise<{
  treasuryWithdrawalDestination: PublicKey;
  treasuryWithdrawalDestinationOwner: PublicKey;
}> {
  if (isNativeOverride === true || (isNativeOverride == null && IS_NATIVE)) {
    return {
      treasuryWithdrawalDestination: wallet,
      treasuryWithdrawalDestinationOwner: wallet,
    };
  }

  const treasuryWithdrawalDestination =
    treasuryWithdrawalDestinationMap[wallet.toString()];
  if (treasuryWithdrawalDestination != null) {
    return {
      treasuryWithdrawalDestination,
      treasuryWithdrawalDestinationOwner: wallet,
    };
  }

  const [treasuryWithdrawalDestinationAta] = findAtaPda(
    wallet,
    await getTreasuryMint(isNativeOverride)
  );
  treasuryWithdrawalDestinationMap[wallet.toString()] =
    treasuryWithdrawalDestinationAta;

  return {
    treasuryWithdrawalDestination: treasuryWithdrawalDestinationAta,
    treasuryWithdrawalDestinationOwner: wallet,
  };
}
