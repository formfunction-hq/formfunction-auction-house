import {
  getTokenAmount,
  logIfDebug,
} from "@formfunction-hq/formfunction-program-shared";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import { ZERO_PUBKEY } from "tests/constants/AuctionHouse";
import { WALLET_CREATOR } from "tests/constants/Wallets";
import getBalance from "tests/utils/getBalance";
import getCreatorShareInLamports from "tests/utils/getCreatorShareInLamports";
import getSellerShareInLamports from "tests/utils/getSellerShareInLamports";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";

export default async function executeSale(
  connection: Connection,
  sdk: AuctionHouseSdk,
  tokenMint: PublicKey,
  buyer: {
    tokenAccount: PublicKey;
    wallet: Keypair;
  },
  sellers: Array<{
    basisPoints: number;
    isExecutingSale: boolean;
    share: number;
    tokenAccount?: PublicKey;
    wallet: Keypair;
  }>,
  buyPrice: number,
  sellPrice: number,
  signer = WALLET_CREATOR
) {
  // Don't check balances if one of seller/buyer is signing since it is hard
  // to account for fees
  const checkBalances = !(
    signer.publicKey.equals(buyer.wallet.publicKey) ||
    sellers.some((seller) => seller.wallet.publicKey.equals(signer.publicKey))
  );
  const { wallet: buyerWallet, tokenAccount: buyerTokenAccount } = buyer;
  const [escrowPaymentAccount] = await sdk.findBuyerEscrow(
    buyerWallet.publicKey,
    tokenMint
  );

  const buyerBalanceBefore = await getBalance(connection, {
    account: escrowPaymentAccount,
  });
  let buyerTokenAmountBefore = 0;
  try {
    buyerTokenAmountBefore = await getTokenAmount(
      connection,
      buyerTokenAccount
    );
  } catch {
    // Throws if ATA hasn't been created. executeSale will create it if it does not exist.
  }
  logIfDebug(
    `buyer before state: balance ${buyerBalanceBefore}, token amount ${buyerTokenAmountBefore}`
  );

  const sellerBalancesBefore = await Promise.all(
    sellers.map(({ wallet }) =>
      getBalance(connection, { wallet: wallet.publicKey })
    )
  );
  const sellerTokenAmountsBefore = await Promise.all(
    sellers.map(({ tokenAccount }) =>
      tokenAccount != null ? getTokenAmount(connection, tokenAccount) : null
    )
  );
  sellerBalancesBefore.forEach((sellerBalance, i) =>
    logIfDebug(
      `seller ${i} before state: balance ${sellerBalance}, token amount ${sellerTokenAmountsBefore[i]}`
    )
  );

  const sellerIndex = sellers.findIndex((s) => s.isExecutingSale)!;
  const seller = sellers[sellerIndex];

  const accounts = {
    buyerPriceInLamports: buyPrice * LAMPORTS_PER_SOL,
    buyerReceiptTokenAccount: buyerTokenAccount,
    sellerPriceInLamports: sellPrice * LAMPORTS_PER_SOL,
    tokenAccount: seller.tokenAccount!,
    tokenMint,
    wallet: signer.publicKey,
    walletBuyer: buyerWallet.publicKey,
    // Naming here is a bit confusing... walletCreator refers to creator of NFT
    walletCreator: seller.wallet.publicKey,
    walletSeller: seller.wallet.publicKey,
  };
  const args = {};
  const remainingAccounts = sellers.map((s) => ({
    isSigner: false,
    isWritable: true,
    pubkey: s.wallet.publicKey,
  }));

  const [lastBidPrice] = await sdk.findLastBidPrice(tokenMint);
  const lastBidPriceAccountInfoBefore =
    await sdk.program.account.lastBidPrice.fetch(lastBidPrice);

  const tx = await sdk.executeSaleV2Tx(
    accounts,
    args,
    remainingAccounts,
    500_000
  );

  await sendTransactionWithWallet(connection, tx, signer);

  // This should not fail after we remove the IX from the SDK
  const lastBidPriceAccountInfoAfter =
    await sdk.program.account.lastBidPrice.fetch(lastBidPrice);
  expect(lastBidPriceAccountInfoAfter.price.toString()).toEqual("0");
  expect(lastBidPriceAccountInfoAfter.bidder?.equals(ZERO_PUBKEY)).toEqual(
    true
  );

  const buyerBalanceAfter = await getBalance(connection, {
    account: escrowPaymentAccount,
  });
  const buyerTokenAmountAfter = await getTokenAmount(
    connection,
    buyerTokenAccount
  );

  const sellerBalancesAfter = await Promise.all(
    sellers.map(({ wallet }) =>
      getBalance(connection, { wallet: wallet.publicKey })
    )
  );
  const sellerTokenAmountsAfter = await Promise.all(
    sellers.map(({ tokenAccount }) =>
      tokenAccount != null ? getTokenAmount(connection, tokenAccount) : null
    )
  );

  logIfDebug(
    `buyer after state: balance ${buyerBalanceAfter}, token amount ${buyerTokenAmountAfter}`
  );
  sellerBalancesAfter.forEach((sellerBalance, i) =>
    logIfDebug(
      `seller ${i} after state: balance ${sellerBalance}, token amount ${sellerTokenAmountsAfter[i]}`
    )
  );

  // Check that NFT was transferred from seller to buyer
  expect(buyerTokenAmountAfter - buyerTokenAmountBefore).toEqual(1);
  expect(
    sellerTokenAmountsBefore[sellerIndex]! -
      sellerTokenAmountsAfter[sellerIndex]!
  ).toEqual(1);

  // Check that all sellers got paid.
  // This assertion relies on the fact that neither seller is the fee payer. If one of them was
  // the fee payer, they would net a bit less.
  if (checkBalances) {
    const isPrimary = lastBidPriceAccountInfoBefore.hasBeenSold === 0;
    for (let i = 0; i < sellers.length; i += 1) {
      const sellerInner = sellers[i];
      const creatorRoyalties = getCreatorShareInLamports(
        buyPrice,
        sellerInner.share,
        sellerInner.basisPoints,
        isPrimary
      );
      if (isPrimary) {
        // Creator royalties encompass the full split if primary sale
        expect(sellerBalancesAfter[i] - sellerBalancesBefore[i]).toEqual(
          creatorRoyalties
        );
      } else {
        const sellerIsExecutingSale = sellerInner.wallet.publicKey.equals(
          seller.wallet.publicKey
        );
        const remainingAmount = sellerIsExecutingSale
          ? getSellerShareInLamports(buyPrice, sellerInner.basisPoints)
          : 0;
        expect(sellerBalancesAfter[i] - sellerBalancesBefore[i]).toEqual(
          creatorRoyalties + remainingAmount
        );
      }
    }
    expect(buyerBalanceBefore - buyerBalanceAfter).toEqual(
      buyPrice * LAMPORTS_PER_SOL
    );
  }
}
