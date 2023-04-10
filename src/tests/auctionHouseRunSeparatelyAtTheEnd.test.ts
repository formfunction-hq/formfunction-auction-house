import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
  BUY_PRICE,
  FEE_WITHDRAWAL_DESTINATION,
  ZERO_PUBKEY,
} from "tests/constants/AuctionHouse";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import expectTransactionToFailWithErrorCode from "tests/utils/errors/expectTransactionToFailWithErrorCode";
import expectEqPubkeys from "tests/utils/expectEqPubkeys";
import getBalance from "tests/utils/getBalance";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getProgram from "tests/utils/getProgram";
import getTestSetup from "tests/utils/getTestSetup";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import getTreasuryWithdrawalDestination from "tests/utils/getTreasuryWithdrawalDestination";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import SaleType from "types/enum/SaleType";

// NOTE: use existing tokenMint to make test faster.
// Use new tokenMint to test everything from scratch.
// let tokenMint: PublicKey = new PublicKey(
//   "2VkhToHLLb3jwZRwmsbx74wVf3i5UHziSU7Fjyp19V9W"
// );
let tokenMint: PublicKey;
let tokenAccount: PublicKey;
let _buyerTokenAccount: PublicKey;
let auctionHouseSdk: AuctionHouseSdk;
let sellers: Array<Keypair>;
let buyers: Array<Keypair>;

let seller: Keypair;
let buyer: Keypair;

const connection = getConnectionForTest();

// Use different auction house to avoid messing up other tests
const programCreator = getProgram(WALLET_CREATOR);

/**
 * IMPORTANT: ALWAYS RUN THIS TEST IN ISOLATION
 *
 * Since this test does things like deposit/withdraw from
 * the fee/treasury accounts, running it in parallel with other
 * tests may lead to random failures (e.g., if you expect a certain
 * amount to be in the treasury balance, it may differ from the
 * actual amount if this test withdraws at the same time)
 */
describe("misc tests (create, update, deposit, withdraw)", () => {
  beforeAll(async () => {
    [
      auctionHouseSdk,
      _buyerTokenAccount,
      tokenAccount,
      tokenMint,
      sellers,
      buyers,
    ] = await getTestSetup(
      connection,
      {
        basisPoints: BASIS_POINTS,
        basisPointsSecondary: BASIS_POINTS_SECONDARY,
        creator: programCreator,
        feeWithdrawalDestination: WALLET_CREATOR.publicKey,
        treasuryMint: await getTreasuryMint(),
        treasuryWithdrawalDestinationOwner: WALLET_CREATOR.publicKey,
      },
      WALLET_CREATOR
    );
    buyer = buyers[0];
    seller = sellers[0];
  });

  it("is auction house created", async () => {
    const auctionHouseObj = await programCreator.account.auctionHouse.fetch(
      auctionHouseSdk.auctionHouse
    );

    const { treasuryWithdrawalDestination } =
      await getTreasuryWithdrawalDestination(WALLET_CREATOR.publicKey);
    expectEqPubkeys(
      auctionHouseObj.auctionHouseFeeAccount,
      auctionHouseSdk.feeAccount
    );
    expectEqPubkeys(
      auctionHouseObj.auctionHouseTreasury,
      auctionHouseSdk.treasuryAccount
    );
    expectEqPubkeys(
      auctionHouseObj.treasuryWithdrawalDestination,
      treasuryWithdrawalDestination
    );
    expectEqPubkeys(
      auctionHouseObj.feeWithdrawalDestination,
      WALLET_CREATOR.publicKey
    );
    expectEqPubkeys(
      auctionHouseObj.treasuryMint as PublicKey,
      await getTreasuryMint()
    );
    expectEqPubkeys(auctionHouseObj.authority, WALLET_CREATOR.publicKey);
    expectEqPubkeys(auctionHouseObj.creator, WALLET_CREATOR.publicKey);

    expect(auctionHouseObj.bump).toEqual(auctionHouseSdk.auctionHouseBump);
    expect(auctionHouseObj.treasuryBump).toEqual(auctionHouseSdk.treasuryBump);
    expect(auctionHouseObj.feePayerBump).toEqual(auctionHouseSdk.feeBump);
    expect(auctionHouseObj.sellerFeeBasisPoints).toEqual(BASIS_POINTS);
    expect(auctionHouseObj.requiresSignOff).toEqual(false);
    expect(auctionHouseObj.canChangeSalePrice).toEqual(false);
    expect(auctionHouseObj.payAllFees).toEqual(true);
  });

  it("create last bid price", async () => {
    const tx = await auctionHouseSdk.createLastBidPriceTx({
      tokenMint,
      wallet: WALLET_CREATOR.publicKey,
    });

    await sendTransactionWithWallet(connection, tx, WALLET_CREATOR);

    const [lastBidPrice] = findLastBidPrice(
      tokenMint,
      auctionHouseSdk.program.programId
    );
    const lastBidPriceAccount = await programCreator.account.lastBidPrice.fetch(
      lastBidPrice
    );
    expect(lastBidPriceAccount.price.toString()).toEqual("0");
    expect(lastBidPriceAccount.bidder?.equals(ZERO_PUBKEY)).toEqual(true);
    expect(lastBidPriceAccount.hasBeenSold).toEqual(0);
  });

  it("create trade state", async () => {
    const tx = await auctionHouseSdk.createTradeStateTx({
      priceInLamports: BUY_PRICE * LAMPORTS_PER_SOL,
      saleType: SaleType.InstantSale,
      tokenAccount,
      tokenMint,
      wallet: WALLET_CREATOR.publicKey,
    });

    await sendTransactionWithWallet(connection, tx, WALLET_CREATOR);

    const [tradeState, tradeStateBump] = await auctionHouseSdk.findTradeState(
      WALLET_CREATOR.publicKey,
      tokenAccount,
      tokenMint,
      BUY_PRICE * LAMPORTS_PER_SOL
    );
    const tradeStateAccount = await connection.getAccountInfo(tradeState);
    expect(Number(tradeStateAccount!.data[0])).toEqual(tradeStateBump);
    expect(tradeStateAccount!.data[1]).toEqual(SaleType.InstantSale);
  });

  it("set previous bidder", async () => {
    const [lastBidPrice] = findLastBidPrice(
      tokenMint,
      auctionHouseSdk.program.programId
    );
    const lastBidPriceAccount1 =
      await programCreator.account.lastBidPrice.fetch(lastBidPrice);
    expect(lastBidPriceAccount1.bidder?.equals(ZERO_PUBKEY)).toEqual(true);

    const tx1 = await auctionHouseSdk.setPreviousBidderTx(
      {
        tokenMint,
      },
      { bidder: buyer.publicKey }
    );
    await sendTransactionWithWallet(connection, tx1, WALLET_CREATOR);
    const lastBidPriceAccount2 =
      await programCreator.account.lastBidPrice.fetch(lastBidPrice);
    expect((lastBidPriceAccount2.bidder as any).toString()).toEqual(
      buyer.publicKey.toString()
    );

    const tx2 = await auctionHouseSdk.setPreviousBidderTx(
      {
        tokenMint,
      },
      { bidder: null }
    );
    await sendTransactionWithWallet(connection, tx2, WALLET_CREATOR);
    const lastBidPriceAccount3 =
      await programCreator.account.lastBidPrice.fetch(lastBidPrice);
    expect(lastBidPriceAccount3.bidder?.equals(ZERO_PUBKEY)).toEqual(true);
  });

  it("set has been sold", async () => {
    const [lastBidPrice] = findLastBidPrice(
      tokenMint,
      auctionHouseSdk.program.programId
    );
    const lastBidPriceAccount = await programCreator.account.lastBidPrice.fetch(
      lastBidPrice
    );
    expect(lastBidPriceAccount.hasBeenSold).toEqual(0);

    const tx1 = await auctionHouseSdk.setHasBeenSoldTx(
      {
        tokenMint,
      },
      { hasBeenSold: true }
    );
    await sendTransactionWithWallet(connection, tx1, WALLET_CREATOR);
    const lastBidPriceAccount2 =
      await programCreator.account.lastBidPrice.fetch(lastBidPrice);
    expect(lastBidPriceAccount2.hasBeenSold).toEqual(1);
  });

  it("set tick size", async () => {
    const [lastBidPrice] = findLastBidPrice(
      tokenMint,
      auctionHouseSdk.program.programId
    );
    const lastBidPriceAccount = await programCreator.account.lastBidPrice.fetch(
      lastBidPrice
    );
    expect(lastBidPriceAccount.tickSizeConstantInLamports.toNumber()).toEqual(
      0
    );

    const tickSize1 = 1e8;
    const tx1 = await auctionHouseSdk.setTickSizeTx(
      {
        owner: seller.publicKey,
        tokenAccount,
        tokenMint,
      },
      { tickSizeConstantInLamports: tickSize1 }
    );
    // Use authority as signer
    await sendTransactionWithWallet(connection, tx1, WALLET_CREATOR);
    const lastBidPriceAccount2 =
      await programCreator.account.lastBidPrice.fetch(lastBidPrice);
    expect(lastBidPriceAccount2.tickSizeConstantInLamports.toNumber()).toEqual(
      tickSize1
    );

    const tickSize2 = 2e8;
    const tx2 = await auctionHouseSdk.setTickSizeTx(
      {
        owner: seller.publicKey,
        tokenAccount,
        tokenMint,
      },
      { tickSizeConstantInLamports: tickSize2 }
    );
    // Use owner as signer
    await sendTransactionWithWallet(connection, tx2, seller);
    const lastBidPriceAccount3 =
      await programCreator.account.lastBidPrice.fetch(lastBidPrice);
    expect(lastBidPriceAccount3.tickSizeConstantInLamports.toNumber()).toEqual(
      tickSize2
    );

    const tickSize3 = 1e7;
    const tx3 = await auctionHouseSdk.setTickSizeTx(
      {
        owner: seller.publicKey,
        tokenAccount,
        tokenMint,
      },
      { tickSizeConstantInLamports: tickSize3 }
    );
    await expectTransactionToFailWithErrorCode({
      connection,
      errorName: "TickSizeTooLow",
      signers: [seller],
      transaction: tx3,
    });
  });

  it("deposit/withdraw", async () => {
    const [escrowPaymentAccount] = await auctionHouseSdk.findBuyerEscrow(
      buyer.publicKey,
      tokenMint
    );

    const amount = 2;
    const amountHalf = amount / 2;
    const escrowBalanceBefore = await getBalance(connection, {
      account: escrowPaymentAccount,
    });

    const depositTx = await auctionHouseSdk.depositTx(
      {
        tokenMint,
        transferAuthority: buyer.publicKey,
        wallet: buyer.publicKey,
      },
      { amount: amount * LAMPORTS_PER_SOL }
    );
    await sendAndConfirmTransaction(connection, depositTx, [buyer]);

    const escrowBalanceAfterDeposit = await getBalance(connection, {
      account: escrowPaymentAccount,
    });
    const escrowBalanceDiff = escrowBalanceAfterDeposit - escrowBalanceBefore;
    expect(escrowBalanceDiff).toEqual(amount * LAMPORTS_PER_SOL);

    // Try withdrawing as buyer
    const withdrawTx = await auctionHouseSdk.withdrawTx(
      {
        tokenMint,
        wallet: buyer.publicKey,
      },
      { amount: amountHalf * LAMPORTS_PER_SOL }
    );
    await sendAndConfirmTransaction(connection, withdrawTx, [buyer]);

    // Try withdrawing as authority
    const withdrawTx2 = await auctionHouseSdk.withdrawTx(
      {
        tokenMint,
        wallet: buyer.publicKey,
      },
      { amount: amountHalf * LAMPORTS_PER_SOL }
    );
    await sendAndConfirmTransaction(connection, withdrawTx2, [WALLET_CREATOR]);

    const escrowBalanceAfterWithdraw = await getBalance(connection, {
      account: escrowPaymentAccount,
    });
    const escrowBalanceDiff2 =
      escrowBalanceAfterWithdraw - escrowBalanceAfterDeposit;
    expect(escrowBalanceDiff2).toEqual(-amount * LAMPORTS_PER_SOL);
  });

  it("update auction house", async () => {
    const {
      treasuryWithdrawalDestination,
      treasuryWithdrawalDestinationOwner,
    } = await getTreasuryWithdrawalDestination();
    const tx = await auctionHouseSdk.updateTx(
      {
        feeWithdrawalDestination: FEE_WITHDRAWAL_DESTINATION,
        newAuthority: WALLET_CREATOR.publicKey,
        payer: WALLET_CREATOR.publicKey,
        treasuryWithdrawalDestination,
        treasuryWithdrawalDestinationOwner,
      },
      {
        basisPoints: BASIS_POINTS * 2,
        basisPointsSecondary: BASIS_POINTS_SECONDARY * 2,
        canChangePrice: true,
        payAllFees: false,
        requiresSignOff: true,
      }
    );
    await sendTransactionWithWallet(connection, tx, WALLET_CREATOR);

    const auctionHouseObj = await programCreator.account.auctionHouse.fetch(
      auctionHouseSdk.auctionHouse
    );

    expectEqPubkeys(
      auctionHouseObj.auctionHouseFeeAccount,
      auctionHouseSdk.feeAccount
    );
    expectEqPubkeys(
      auctionHouseObj.auctionHouseTreasury,
      auctionHouseSdk.treasuryAccount
    );
    expectEqPubkeys(
      auctionHouseObj.treasuryWithdrawalDestination,
      treasuryWithdrawalDestination
    );
    expectEqPubkeys(
      auctionHouseObj.feeWithdrawalDestination,
      FEE_WITHDRAWAL_DESTINATION
    );
    expectEqPubkeys(
      auctionHouseObj.treasuryMint as PublicKey,
      await getTreasuryMint()
    );
    expectEqPubkeys(auctionHouseObj.authority, WALLET_CREATOR.publicKey);
    expectEqPubkeys(auctionHouseObj.creator, WALLET_CREATOR.publicKey);

    expect(auctionHouseObj.bump).toEqual(auctionHouseSdk.auctionHouseBump);
    expect(auctionHouseObj.treasuryBump).toEqual(auctionHouseSdk.treasuryBump);
    expect(auctionHouseObj.feePayerBump).toEqual(auctionHouseSdk.feeBump);
    expect(auctionHouseObj.sellerFeeBasisPoints).toEqual(BASIS_POINTS * 2);
    expect(auctionHouseObj.requiresSignOff).toEqual(true);
    expect(auctionHouseObj.canChangeSalePrice).toEqual(true);
    expect(auctionHouseObj.payAllFees).toEqual(false);
    expect(auctionHouseObj.sellerFeeBasisPointsSecondary).toEqual(
      BASIS_POINTS_SECONDARY * 2
    );
  });
});
