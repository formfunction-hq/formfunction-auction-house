import { Environment } from "@formfunction-hq/formfunction-program-shared";
import getAntiBotAuthorityForEnvironment from "address-lookup-table/addresses/auction-house/getAntiBotAuthorityForEnvironment";
import getAuctionHouseAccountKeyForCurrency from "address-lookup-table/addresses/auction-house/getAuctionHouseAccountKeyForCurrency";
import getAuctionHouseAuthorityForEnvironment from "address-lookup-table/addresses/auction-house/getAuctionHouseAuthorityForEnvironment";
import getAuctionHouseProgramIdForEnvironment from "address-lookup-table/addresses/auction-house/getAuctionHouseProgramIdForEnvironment";
import getTreasuryMintForCurrency from "address-lookup-table/addresses/auction-house/getTreasuryMintForCurrency";
import AuctionHouseAddresses from "address-lookup-table/types/AuctionHouseAddresses";
import AuctionHouseOverrideForTest from "address-lookup-table/types/AuctionHouseOverrideForTest";
import Currency from "address-lookup-table/types/Currency";
import findAuctionHouseFeeAccount from "solana/pdas/findAuctionHouseFeeAccount";
import findAuctionHouseTreasuryAccount from "solana/pdas/findAuctionHouseTreasuryAccount";

export default async function getAuctionHouseAddressesForCurrency(
  environment: Environment,
  currency: Currency,
  auctionHouseOverrideForTest?: AuctionHouseOverrideForTest
): Promise<AuctionHouseAddresses> {
  const programId = getAuctionHouseProgramIdForEnvironment(environment);
  const antiBotAuthority = getAntiBotAuthorityForEnvironment(environment);
  const authority =
    auctionHouseOverrideForTest?.authority ??
    getAuctionHouseAuthorityForEnvironment(environment);
  const treasuryMint =
    auctionHouseOverrideForTest?.treasuryMint ??
    getTreasuryMintForCurrency(environment, currency);
  const auctionHouse =
    auctionHouseOverrideForTest?.auctionHouse ??
    getAuctionHouseAccountKeyForCurrency(environment, currency);
  const [feeAccount] = findAuctionHouseFeeAccount(auctionHouse, programId);
  const [treasuryAccount] = findAuctionHouseTreasuryAccount(
    auctionHouse,
    programId
  );

  return {
    antiBotAuthority,
    auctionHouse,
    authority,
    feeAccount,
    programId,
    treasuryAccount,
    treasuryMint,
  };
}
