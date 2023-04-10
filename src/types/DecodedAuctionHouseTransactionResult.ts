/**
 * NOTE: This is an auto-generated file. Don't edit it directly.
 */
import {
  DecodedInstructionAccount,
  GenericDecodedTransaction,
} from "@formfunction-hq/formfunction-program-shared";
import { IDL as AUCTION_HOUSE_IDL } from "idl/AuctionHouse";
import AuctionHouseInstructionName from "types/AuctionHouseInstructionName";

const identity = <T>(val: T): T => val;

const ixMap = AUCTION_HOUSE_IDL.instructionsMap ?? {};

const AppendEditionAllowlistMerkleRootsAccounts = (
  ixMap.appendEditionAllowlistMerkleRoots ?? []
).map(identity);

const BuyEditionV2Accounts = (ixMap.buyEditionV2 ?? []).map(identity);

const BuyV2Accounts = (ixMap.buyV2 ?? []).map(identity);

const CancelV2Accounts = (ixMap.cancelV2 ?? []).map(identity);

const ClearEditionAllowlistMerkleRootsAccounts = (
  ixMap.clearEditionAllowlistMerkleRoots ?? []
).map(identity);

const CloseEditionAllowlistSettingsAccountAccounts = (
  ixMap.closeEditionAllowlistSettingsAccount ?? []
).map(identity);

const CloseEditionDistributorAccounts = (
  ixMap.closeEditionDistributor ?? []
).map(identity);

const CloseEditionDistributorTokenAccountAccounts = (
  ixMap.closeEditionDistributorTokenAccount ?? []
).map(identity);

const CreateAuctionHouseAccounts = (ixMap.createAuctionHouse ?? []).map(
  identity
);

const CreateEditionDistributorAccounts = (
  ixMap.createEditionDistributor ?? []
).map(identity);

const CreateLastBidPriceAccounts = (ixMap.createLastBidPrice ?? []).map(
  identity
);

const CreateTradeStateAccounts = (ixMap.createTradeState ?? []).map(identity);

const DepositAccounts = (ixMap.deposit ?? []).map(identity);

const ExecuteSaleV2Accounts = (ixMap.executeSaleV2 ?? []).map(identity);

const SellAccounts = (ixMap.sell ?? []).map(identity);

const SetEditionDistributorBotProtectionEnabledAccounts = (
  ixMap.setEditionDistributorBotProtectionEnabled ?? []
).map(identity);

const SetEditionDistributorLimitPerAddressAccounts = (
  ixMap.setEditionDistributorLimitPerAddress ?? []
).map(identity);

const SetHasBeenSoldAccounts = (ixMap.setHasBeenSold ?? []).map(identity);

const SetLastBidPriceAccounts = (ixMap.setLastBidPrice ?? []).map(identity);

const SetPreviousBidderAccounts = (ixMap.setPreviousBidder ?? []).map(identity);

const SetTickSizeAccounts = (ixMap.setTickSize ?? []).map(identity);

const ThawDelegatedAccountAccounts = (ixMap.thawDelegatedAccount ?? []).map(
  identity
);

const UpdateAuctionHouseAccounts = (ixMap.updateAuctionHouse ?? []).map(
  identity
);

const UpdateEditionDistributorAccounts = (
  ixMap.updateEditionDistributor ?? []
).map(identity);

const WithdrawAccounts = (ixMap.withdraw ?? []).map(identity);

const WithdrawBonkAccounts = (ixMap.withdrawBonk ?? []).map(identity);

const WithdrawFromFeeAccounts = (ixMap.withdrawFromFee ?? []).map(identity);

const WithdrawFromTreasuryAccounts = (ixMap.withdrawFromTreasury ?? []).map(
  identity
);

type DecodedAuctionHouseTransactionResult = {
  appendEditionAllowlistMerkleRoots?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof AppendEditionAllowlistMerkleRootsAccounts[0]]: DecodedInstructionAccount;
    };
  };
  buyEditionV2?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof BuyEditionV2Accounts[0]]: DecodedInstructionAccount;
    };
  };
  buyV2?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof BuyV2Accounts[0]]: DecodedInstructionAccount;
    };
  };
  cancelV2?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof CancelV2Accounts[0]]: DecodedInstructionAccount;
    };
  };
  clearEditionAllowlistMerkleRoots?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof ClearEditionAllowlistMerkleRootsAccounts[0]]: DecodedInstructionAccount;
    };
  };
  closeEditionAllowlistSettingsAccount?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof CloseEditionAllowlistSettingsAccountAccounts[0]]: DecodedInstructionAccount;
    };
  };
  closeEditionDistributor?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof CloseEditionDistributorAccounts[0]]: DecodedInstructionAccount;
    };
  };
  closeEditionDistributorTokenAccount?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof CloseEditionDistributorTokenAccountAccounts[0]]: DecodedInstructionAccount;
    };
  };
  createAuctionHouse?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof CreateAuctionHouseAccounts[0]]: DecodedInstructionAccount;
    };
  };
  createEditionDistributor?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof CreateEditionDistributorAccounts[0]]: DecodedInstructionAccount;
    };
  };
  createLastBidPrice?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof CreateLastBidPriceAccounts[0]]: DecodedInstructionAccount;
    };
  };
  createTradeState?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof CreateTradeStateAccounts[0]]: DecodedInstructionAccount;
    };
  };
  deposit?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof DepositAccounts[0]]: DecodedInstructionAccount;
    };
  };
  executeSaleV2?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof ExecuteSaleV2Accounts[0]]: DecodedInstructionAccount;
    };
  };
  sell?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof SellAccounts[0]]: DecodedInstructionAccount;
    };
  };
  setEditionDistributorBotProtectionEnabled?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof SetEditionDistributorBotProtectionEnabledAccounts[0]]: DecodedInstructionAccount;
    };
  };
  setEditionDistributorLimitPerAddress?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof SetEditionDistributorLimitPerAddressAccounts[0]]: DecodedInstructionAccount;
    };
  };
  setHasBeenSold?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof SetHasBeenSoldAccounts[0]]: DecodedInstructionAccount;
    };
  };
  setLastBidPrice?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof SetLastBidPriceAccounts[0]]: DecodedInstructionAccount;
    };
  };
  setPreviousBidder?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof SetPreviousBidderAccounts[0]]: DecodedInstructionAccount;
    };
  };
  setTickSize?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof SetTickSizeAccounts[0]]: DecodedInstructionAccount;
    };
  };
  thawDelegatedAccount?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof ThawDelegatedAccountAccounts[0]]: DecodedInstructionAccount;
    };
  };
  updateAuctionHouse?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof UpdateAuctionHouseAccounts[0]]: DecodedInstructionAccount;
    };
  };
  updateEditionDistributor?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof UpdateEditionDistributorAccounts[0]]: DecodedInstructionAccount;
    };
  };
  withdraw?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof WithdrawAccounts[0]]: DecodedInstructionAccount;
    };
  };
  withdrawBonk?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof WithdrawBonkAccounts[0]]: DecodedInstructionAccount;
    };
  };
  withdrawFromFee?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof WithdrawFromFeeAccounts[0]]: DecodedInstructionAccount;
    };
  };
  withdrawFromTreasury?: GenericDecodedTransaction<AuctionHouseInstructionName> & {
    accountsMap: {
      [Key in typeof WithdrawFromTreasuryAccounts[0]]: DecodedInstructionAccount;
    };
  };
};

export default DecodedAuctionHouseTransactionResult;
