import {
  createAtaIx,
  createTransferAtaIx,
  filterNulls,
  findAtaPda,
  findTokenMetadataPda,
  getMasterEditionSupply,
  ixsToTx,
  ixToTx,
  Maybe,
  MaybeUndef,
  MerkleRoot,
} from "@formfunction-hq/formfunction-program-shared";
import { createUpdateMetadataAccountInstruction } from "@metaplex-foundation/mpl-token-metadata";
import {
  AccountMeta,
  ComputeBudgetProgram,
  ParsedTransactionWithMeta,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Dayjs } from "dayjs";
import getSolAuctionHouseAccountByProgramId from "solana/auction-house/getSolAuctionHouseAccountByProgramId";
import getTradeState from "solana/auction-house/getTradeState";
import auctionHouseAppendEditionAllowlistMerkleRootsIx from "solana/instructions/auctionHouseAppendEditionAllowlistMerkleRootsIx";
import auctionHouseBuyEditionV2Ix from "solana/instructions/auctionHouseBuyEditionV2Ix";
import auctionHouseBuyV2Ix from "solana/instructions/auctionHouseBuyV2Ix";
import auctionHouseCancelV2Ix from "solana/instructions/auctionHouseCancelV2Ix";
import auctionHouseClearEditionAllowlistMerkleRootsIx from "solana/instructions/auctionHouseClearEditionAllowlistMerkleRootsIx";
import auctionHouseCloseEditionAllowlistSettingsAccountIx from "solana/instructions/auctionHouseCloseEditionAllowlistSettingsAccountIx";
import auctionHouseCloseEditionDistributorIx from "solana/instructions/auctionHouseCloseEditionDistributorIx";
import auctionHouseCloseEditionDistributorTokenAccountIx from "solana/instructions/auctionHouseCloseEditionDistributorTokenAccountIx";
import auctionHouseCreateEditionDistributorIx from "solana/instructions/auctionHouseCreateEditionDistributorIx";
import auctionHouseCreateIx from "solana/instructions/auctionHouseCreateIx";
import auctionHouseCreateLastBidPriceIx from "solana/instructions/auctionHouseCreateLastBidPriceIx";
import auctionHouseCreateTradeStateIx from "solana/instructions/auctionHouseCreateTradeStateIx";
import auctionHouseDepositIx from "solana/instructions/auctionHouseDepositIx";
import auctionHouseExecuteSaleV2Ix from "solana/instructions/auctionHouseExecuteSaleV2Ix";
import auctionHouseSellIx from "solana/instructions/auctionHouseSellIx";
import auctionHouseSetEditionDistributorAntiBotProtectionEnabledIx from "solana/instructions/auctionHouseSetEditionDistributorAntiBotProtectionEnabledIx";
import auctionHouseSetEditionDistributorLimitPerAddressIx from "solana/instructions/auctionHouseSetEditionDistributorLimitPerAddressIx";
import auctionHouseSetHasBeenSoldIx from "solana/instructions/auctionHouseSetHasBeenSoldIx";
import auctionHouseSetPreviousBidderIx from "solana/instructions/auctionHouseSetPreviousBidderIx";
import auctionHouseSetTickSizeIx from "solana/instructions/auctionHouseSetTickSizeIx";
import auctionHouseThawDelegatedAccountIx from "solana/instructions/auctionHouseThawDelegatedAccountIx";
import auctionHouseUpdateEditionDistributorIx from "solana/instructions/auctionHouseUpdateEditionDistributorIx";
import auctionHouseUpdateIx from "solana/instructions/auctionHouseUpdateIx";
import auctionHouseWithdrawBonkIx from "solana/instructions/auctionHouseWithdrawBonkIx";
import auctionHouseWithdrawFromTreasuryIx from "solana/instructions/auctionHouseWithdrawFromTreasuryIx";
import auctionHouseWithdrawIx from "solana/instructions/auctionHouseWithdrawIx";
import findAuctionHouse from "solana/pdas/findAuctionHouse";
import findAuctionHouseBuyerEscrow from "solana/pdas/findAuctionHouseBuyerEscrow";
import findAuctionHouseFeeAccount from "solana/pdas/findAuctionHouseFeeAccount";
import findAuctionHouseProgramAsSigner from "solana/pdas/findAuctionHouseProgramAsSigner";
import findAuctionHouseTreasuryAccount from "solana/pdas/findAuctionHouseTreasuryAccount";
import findEditionAllowlistSettingsAccount from "solana/pdas/findEditionAllowlistSettingsAccount";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import findLastBidPrice from "solana/pdas/findLastBidPrice";
import getRemainingAccounts from "solana/utils/getRemainingAccounts";
import getWalletIfNativeElseAta from "solana/utils/getWalletIfNativeElseAta";
import AuctionHouseProgram from "types/AuctionHouseProgram";
import PriceFunctionType from "types/enum/PriceFunctionType";
import SaleType from "types/enum/SaleType";
import MerkleAllowlistBuyerWithProof from "types/merkle-tree/MerkleAllowlistBuyerWithProof";

export default class AuctionHouseSdk {
  public program: AuctionHouseProgram;

  public antiBotAuthority: PublicKey;
  public auctionHouse: PublicKey;
  public auctionHouseBump: number;
  public feeAccount: PublicKey;
  public feeBump: number;
  public treasuryAccount: PublicKey;
  public treasuryBump: number;
  public treasuryMint: PublicKey;
  public walletAuthority: PublicKey;
  public walletCreator: PublicKey;

  constructor(
    program: AuctionHouseProgram,
    {
      antiBotAuthority,
      auctionHouse,
      auctionHouseBump,
      feeAccount,
      feeBump,
      treasuryAccount,
      treasuryBump,
      treasuryMint,
      walletAuthority,
      walletCreator,
    }: {
      antiBotAuthority: PublicKey;
      auctionHouse: PublicKey;
      auctionHouseBump: number;
      feeAccount: PublicKey;
      feeBump: number;
      treasuryAccount: PublicKey;
      treasuryBump: number;
      treasuryMint: PublicKey;
      walletAuthority: PublicKey;
      walletCreator: PublicKey;
    }
  ) {
    this.program = program;

    this.antiBotAuthority = antiBotAuthority;
    this.auctionHouse = auctionHouse;
    this.auctionHouseBump = auctionHouseBump;
    this.feeAccount = feeAccount;
    this.feeBump = feeBump;
    this.treasuryAccount = treasuryAccount;
    this.treasuryBump = treasuryBump;
    this.treasuryMint = treasuryMint;
    this.walletAuthority = walletAuthority;
    this.walletCreator = walletCreator;
  }

  static init(
    program: AuctionHouseProgram,
    {
      antiBotAuthority,
      treasuryMint,
      walletAuthority,
      walletCreator,
    }: {
      antiBotAuthority: PublicKey;
      treasuryMint: PublicKey;
      walletAuthority: PublicKey;
      walletCreator: PublicKey;
    }
  ): AuctionHouseSdk {
    const [auctionHouse, auctionHouseBump] = findAuctionHouse(
      walletCreator,
      treasuryMint,
      program.programId
    );

    const [feeAccount, feeBump] = findAuctionHouseFeeAccount(
      auctionHouse,
      program.programId
    );

    const [treasuryAccount, treasuryBump] = findAuctionHouseTreasuryAccount(
      auctionHouse,
      program.programId
    );

    return new this(program, {
      antiBotAuthority,
      auctionHouse,
      auctionHouseBump,
      feeAccount,
      feeBump,
      treasuryAccount,
      treasuryBump,
      treasuryMint,
      walletAuthority,
      walletCreator,
    });
  }

  private async createTradeState(
    {
      tokenAccount,
      tokenMint,
      wallet,
    }: {
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    {
      allocationSize,
      priceInLamports,
      saleType,
      tokenSize,
    }: {
      allocationSize?: number;
      priceInLamports: number;
      saleType: SaleType;
      tokenSize?: number;
    }
  ) {
    return auctionHouseCreateTradeStateIx(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseFeeAccount: this.feeAccount,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        program: this.program,
        tokenAccount,
        tokenMint,
        treasuryMint: this.treasuryMint,
        wallet,
      },
      {
        allocationSize,
        priceInLamports,
        saleType,
        tokenSize,
      }
    );
  }

  private async buyV2(
    saleType: SaleType,
    {
      previousBidderWallet,
      priceInLamports,
      tokenAccount,
      tokenMint,
      wallet,
    }: {
      previousBidderWallet: PublicKey;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    {
      auctionEndTime,
      tokenSize = 1,
    }: {
      auctionEndTime?: Dayjs;
      tokenSize?: number;
    }
  ) {
    const tradeStateIx = await this.createTradeState(
      {
        tokenAccount,
        tokenMint,
        wallet,
      },
      {
        priceInLamports,
        saleType,
        tokenSize,
      }
    );
    const buyIx = await auctionHouseBuyV2Ix(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        feeAccount: this.feeAccount,
        previousBidderRefundAccount: await getWalletIfNativeElseAta(
          previousBidderWallet,
          this.treasuryMint
        ),
        previousBidderWallet,
        priceInLamports,
        program: this.program,
        tokenAccount,
        tokenMint,
        treasuryMint: this.treasuryMint,
        walletBuyer: wallet,
      },
      { auctionEndTime, tokenSize }
    );
    return ixToTx(tradeStateIx).add(buyIx);
  }

  async buyV2Tx(
    accounts: {
      previousBidderWallet: PublicKey;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    args: {
      auctionEndTime?: Dayjs;
      tokenSize?: number;
    }
  ) {
    return this.buyV2(SaleType.Auction, accounts, args);
  }

  async buyV2InstantSaleTx(
    accounts: {
      previousBidderWallet: PublicKey;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    args: {
      tokenSize?: number;
    }
  ) {
    return this.buyV2(SaleType.InstantSale, accounts, args);
  }

  async buyV2MakeOfferTx(
    accounts: {
      previousBidderWallet: PublicKey;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    args: {
      tokenSize?: number;
    },
    shouldCreateLastBidPriceIfNotExists = false
  ) {
    const [buyTx, createLastBidPriceTx] = await Promise.all([
      this.buyV2(SaleType.Offer, accounts, args),
      shouldCreateLastBidPriceIfNotExists
        ? this.createLastBidPriceIfNotExistsTx({
            tokenMint: accounts.tokenMint,
            wallet: accounts.wallet,
          })
        : null,
    ]);

    return ixsToTx([
      // Placing an offer requires the last_bid_price account to be
      // initialized, so we create it if needed.
      ...(createLastBidPriceTx == null
        ? []
        : createLastBidPriceTx.instructions),
      ...buyTx.instructions,
    ]);
  }

  async buyAndCancelTx(
    {
      oldPriceInLamports,
      previousBidderWallet,
      priceInLamports,
      tokenAccount,
      tokenMint,
      wallet,
    }: {
      oldPriceInLamports: Maybe<number>;
      previousBidderWallet: PublicKey;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    {
      auctionEndTime,
      tokenSize = 1,
    }: {
      auctionEndTime?: Dayjs;
      tokenSize?: number;
    }
  ) {
    const [cancelTradeState] = await this.findTradeState(
      wallet,
      tokenAccount,
      tokenMint,
      oldPriceInLamports ?? 0
    );
    const cancelTradeStateAccountInfo =
      await this.program.provider.connection.getAccountInfo(
        cancelTradeState,
        "finalized"
      );

    const cancelIx =
      oldPriceInLamports == null || cancelTradeStateAccountInfo == null
        ? null
        : await auctionHouseCancelV2Ix(
            {
              auctionHouse: this.auctionHouse,
              auctionHouseProgramId: this.program.programId,
              authority: this.walletAuthority,
              feeAccount: this.feeAccount,
              priceInLamports: oldPriceInLamports,
              program: this.program,
              tokenAccount,
              tokenMint,
              treasuryMint: this.treasuryMint,
              wallet,
            },
            { tokenSize }
          );

    const buyTx = await this.buyV2(
      SaleType.Auction,
      {
        previousBidderWallet,
        priceInLamports,
        tokenAccount,
        tokenMint,
        wallet,
      },
      { auctionEndTime, tokenSize }
    );

    const tx = new Transaction();
    tx.add(...filterNulls([cancelIx, ...buyTx.instructions]));

    return tx;
  }

  async cancelTx(
    {
      priceInLamports,
      tokenAccount,
      tokenMint,
      wallet,
    }: {
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    { tokenSize = 1 }: { tokenSize?: number }
  ) {
    const ix = await auctionHouseCancelV2Ix(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        feeAccount: this.feeAccount,
        priceInLamports,
        program: this.program,
        tokenAccount,
        tokenMint,
        treasuryMint: this.treasuryMint,
        wallet,
      },
      { tokenSize }
    );
    return ixToTx(ix);
  }

  async buyEditionV2Tx(
    {
      buyer,
      mint,
      newMint,
    }: {
      buyer: PublicKey;
      mint: PublicKey;
      newMint: PublicKey;
    },
    {
      buyerWithAllowlistProofData,
      priceInLamports,
    }: {
      buyerWithAllowlistProofData: Maybe<MerkleAllowlistBuyerWithProof>;
      priceInLamports: number;
    },
    // Creators
    remainingAccounts: Array<AccountMeta>
  ) {
    const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400000,
    });
    const buyIx = await auctionHouseBuyEditionV2Ix(
      {
        antiBotAuthority: this.antiBotAuthority,
        auctionHouse: this.auctionHouse,
        authority: this.walletAuthority,
        buyer,
        mint,
        newMint,
        program: this.program,
        treasuryMint: this.treasuryMint,
      },
      { buyerWithAllowlistProofData, priceInLamports },
      (await getRemainingAccounts(remainingAccounts, this.treasuryMint))!
    );

    return ixsToTx([computeLimitIx, buyIx]);
  }

  async createLastBidPriceTx({
    tokenMint,
    wallet,
  }: {
    tokenMint: PublicKey;
    wallet: PublicKey;
  }) {
    const auctionHouseAddressKey = getSolAuctionHouseAccountByProgramId(
      this.program.programId
    );
    const ix = await auctionHouseCreateLastBidPriceIx({
      auctionHouse: auctionHouseAddressKey,
      auctionHouseProgramId: this.program.programId,
      program: this.program,
      tokenMint,
      wallet,
    });
    return ixToTx(ix);
  }

  private async createLastBidPriceIfNotExistsTx({
    tokenMint,
    wallet,
  }: {
    tokenMint: PublicKey;
    wallet: PublicKey;
  }) {
    const [lastBidPrice] = await this.findLastBidPrice(tokenMint);
    const lastBidPriceAccount =
      await this.program.provider.connection.getAccountInfo(lastBidPrice);
    if (lastBidPriceAccount != null) {
      return null;
    }

    return this.createLastBidPriceTx({ tokenMint, wallet });
  }

  async closeEditionDistributor({
    mint,
    owner,
    rentReceiver,
  }: {
    mint: PublicKey;
    owner: PublicKey;
    rentReceiver: PublicKey;
  }) {
    const ix = await auctionHouseCloseEditionDistributorIx({
      auctionHouse: this.auctionHouse,
      authority: this.walletAuthority,
      mint,
      owner,
      program: this.program,
      rentReceiver,
    });

    return ixToTx(ix);
  }

  async closeEditionDistributorTokenAccount({
    mint,
    owner,
    rentReceiver,
    tokenReceiver,
    wallet,
  }: {
    mint: PublicKey;
    owner: PublicKey;
    rentReceiver: PublicKey;
    tokenReceiver: PublicKey;
    wallet: PublicKey;
  }) {
    const [ownerAta] = findAtaPda(owner, mint);
    const ownerAtaAccount =
      await this.program.provider.connection.getAccountInfo(ownerAta);
    const createAtaInstruction =
      ownerAtaAccount != null ? null : await createAtaIx(mint, owner, wallet);

    const ix = await auctionHouseCloseEditionDistributorTokenAccountIx({
      auctionHouse: this.auctionHouse,
      authority: this.walletAuthority,
      mint,
      owner,
      program: this.program,
      rentReceiver,
      tokenReceiver,
    });

    return ixsToTx(filterNulls([createAtaInstruction, ix]));
  }

  async createTradeStateTx({
    allocationSize,
    priceInLamports,
    saleType,
    tokenAccount,
    tokenMint,
    wallet,
  }: {
    allocationSize?: number;
    priceInLamports: number;
    saleType: SaleType;
    tokenAccount: PublicKey;
    tokenMint: PublicKey;
    wallet: PublicKey;
  }) {
    const ix = await this.createTradeState(
      {
        tokenAccount,
        tokenMint,
        wallet,
      },
      {
        allocationSize,
        priceInLamports,
        saleType,
      }
    );

    return ixToTx(ix);
  }

  async createEditionDistributorTx(
    {
      mint,
      owner,
      tokenAccount,
    }: {
      mint: PublicKey;
      owner: PublicKey;
      tokenAccount: PublicKey;
    },
    {
      allowlistSalePrice,
      allowlistSaleStartTime,
      antiBotProtectionEnabled,
      limitPerAddress,
      priceFunctionType,
      priceParams,
      publicSaleStartTime,
      saleEndTime,
      startingPriceLamports,
    }: {
      allowlistSalePrice: Maybe<number>;
      allowlistSaleStartTime: Maybe<number>;
      antiBotProtectionEnabled: boolean;
      limitPerAddress?: Maybe<number>;
      priceFunctionType: PriceFunctionType;
      priceParams: Array<number>;
      publicSaleStartTime: Maybe<number>;
      saleEndTime: Maybe<number>;
      startingPriceLamports: number;
    },
    shouldTransferMasterEdition = true
  ) {
    const ix = await auctionHouseCreateEditionDistributorIx(
      {
        mint,
        owner,
        program: this.program,
        tokenAccount,
        treasuryMint: this.treasuryMint,
      },
      {
        allowlistSalePrice,
        allowlistSaleStartTime,
        priceFunctionType,
        priceParams,
        publicSaleStartTime,
        saleEndTime,
        startingPriceLamports,
      }
    );

    const setAntiBotProtectionEnabledIx = antiBotProtectionEnabled
      ? [
          await auctionHouseSetEditionDistributorAntiBotProtectionEnabledIx(
            {
              auctionHouse: this.auctionHouse,
              authority: this.walletAuthority,
              mint,
              owner,
              program: this.program,
            },
            {
              antiBotProtectionEnabled,
            }
          ),
        ]
      : [];

    const setLimitPerAddressIx =
      limitPerAddress != null
        ? [
            await auctionHouseSetEditionDistributorLimitPerAddressIx(
              {
                auctionHouse: this.auctionHouse,
                authority: this.walletAuthority,
                mint,
                owner,
                program: this.program,
              },
              {
                limitPerAddress,
              }
            ),
          ]
        : [];

    const extraIxs = [
      ...setLimitPerAddressIx,
      ...setAntiBotProtectionEnabledIx,
    ];

    if (!shouldTransferMasterEdition) {
      return ixsToTx([ix, ...extraIxs]);
    }

    const transferTx = await this.transferMasterEditionToDistributorTx({
      mint,
      sourceTokenAccount: tokenAccount,
      wallet: owner,
    });
    return ixsToTx([ix, ...extraIxs, ...transferTx.instructions]);
  }

  async createTx(
    {
      feeWithdrawalDestination,
      payer,
      treasuryWithdrawalDestination,
      treasuryWithdrawalDestinationOwner,
    }: {
      feeWithdrawalDestination: PublicKey;
      payer: PublicKey;
      treasuryWithdrawalDestination: PublicKey;
      treasuryWithdrawalDestinationOwner: PublicKey;
    },
    {
      basisPoints,
      basisPointsSecondary,
      canChangePrice,
      payAllFees,
      requiresSignOff,
    }: {
      basisPoints: number;
      basisPointsSecondary: number;
      canChangePrice: boolean;
      payAllFees: boolean;
      requiresSignOff: boolean;
    }
  ) {
    const ix = await auctionHouseCreateIx(
      {
        auctionHouse: this.auctionHouse,
        authority: this.walletAuthority,
        feeAccount: this.feeAccount,
        feeWithdrawalDestination,
        payer,
        program: this.program,
        treasuryAccount: this.treasuryAccount,
        treasuryMint: this.treasuryMint,
        treasuryWithdrawalDestination,
        treasuryWithdrawalDestinationOwner,
      },
      {
        auctionHouseBump: this.auctionHouseBump,
        basisPoints,
        basisPointsSecondary,
        canChangePrice,
        feeBump: this.feeBump,
        payAllFees,
        requiresSignOff,
        treasuryBump: this.treasuryBump,
      }
    );
    return ixToTx(ix);
  }

  async depositTx(
    {
      paymentAccount,
      tokenMint,
      transferAuthority,
      wallet,
    }: {
      paymentAccount?: PublicKey;
      tokenMint: PublicKey;
      transferAuthority: PublicKey;
      wallet: PublicKey;
    },
    { amount }: { amount: number }
  ) {
    const ix = await auctionHouseDepositIx(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        feeAccount: this.feeAccount,
        paymentAccount:
          paymentAccount ??
          (await getWalletIfNativeElseAta(wallet, this.treasuryMint)),
        program: this.program,
        tokenMint,
        transferAuthority,
        treasuryMint: this.treasuryMint,
        wallet,
      },
      { amount }
    );
    return ixToTx(ix);
  }

  async executeSaleV2Tx(
    {
      buyerPriceInLamports,
      buyerReceiptTokenAccount,
      sellerPriceInLamports,
      tokenAccount,
      tokenMint,
      wallet,
      walletBuyer,
      walletCreator,
      walletSeller,
    }: {
      buyerPriceInLamports: number;
      buyerReceiptTokenAccount?: PublicKey;
      sellerPriceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
      walletBuyer: PublicKey;
      walletCreator: PublicKey;
      walletSeller: PublicKey;
    },
    { tokenSize = 1 }: { tokenSize?: number },
    remainingAccounts?: Array<AccountMeta>,
    computeUnitLimit?: number
  ) {
    const computeLimitIx =
      computeUnitLimit == null
        ? null
        : ComputeBudgetProgram.setComputeUnitLimit({
            units: computeUnitLimit,
          });
    const updateMetadataIxs: Array<TransactionInstruction> = [];

    // If this is a primary sale, should update the metadata
    if (walletCreator.equals(wallet)) {
      const [metadataPda] = findTokenMetadataPda(tokenMint);

      const metadataIx = createUpdateMetadataAccountInstruction(
        {
          metadata: metadataPda,
          updateAuthority: wallet,
        },
        {
          updateMetadataAccountArgs: {
            data: null,
            primarySaleHappened: true,
            updateAuthority: wallet,
          },
        }
      );
      updateMetadataIxs.push(metadataIx);
    }

    const [lastBidPrice] = findLastBidPrice(tokenMint, this.program.programId);

    const executeIx = await auctionHouseExecuteSaleV2Ix(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        buyerPriceInLamports,
        buyerReceiptTokenAccount,
        lastBidPrice,
        program: this.program,
        sellerPriceInLamports,
        tokenAccount,
        tokenMint,
        treasuryMint: this.treasuryMint,
        walletBuyer,
        walletCreator,
        walletSeller,
      },
      { tokenSize },
      await getRemainingAccounts(remainingAccounts, this.treasuryMint)
    );

    const tx = new Transaction();
    // Important to update the metadata AFTER the sale is executed, so fees get
    // taken accordingly.
    const ixs = filterNulls([computeLimitIx, executeIx, ...updateMetadataIxs]);
    tx.add(...ixs);

    return tx;
  }

  async getNextEditionNumber(mint: PublicKey) {
    const supply = await getMasterEditionSupply(
      this.program.provider.connection,
      mint
    );
    return supply + 1;
  }

  private async sell(
    saleType: SaleType,
    shouldCreateLastBidPriceIfNotExists: boolean,
    {
      priceInLamports,
      tokenAccount,
      tokenMint,
      wallet,
    }: {
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    { tokenSize = 1 }: { tokenSize?: number }
  ) {
    const tradeStateIx = await this.createTradeState(
      {
        tokenAccount,
        tokenMint,
        wallet,
      },
      {
        priceInLamports,
        saleType,
        tokenSize,
      }
    );

    const [createLastBidPriceTx, sellIx] = await Promise.all([
      shouldCreateLastBidPriceIfNotExists
        ? this.createLastBidPriceIfNotExistsTx({ tokenMint, wallet })
        : null,
      auctionHouseSellIx(
        {
          auctionHouse: this.auctionHouse,
          auctionHouseProgramId: this.program.programId,
          authority: this.walletAuthority,
          feeAccount: this.feeAccount,
          priceInLamports,
          program: this.program,
          tokenAccount,
          tokenMint,
          treasuryMint: this.treasuryMint,
          walletSeller: wallet,
        },
        { tokenSize }
      ),
    ]);

    return ixsToTx([
      // Executing a sale requires the last_bid_price account to be
      // created. Thus, we initialize the account during listing if
      // needed.
      ...(createLastBidPriceTx == null
        ? []
        : createLastBidPriceTx.instructions),
      tradeStateIx,
      sellIx,
    ]);
  }

  async sellTx(
    accounts: {
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    args: { tokenSize?: number },
    shouldCreateLastBidPriceIfNotExists = false
  ) {
    return this.sell(
      SaleType.Auction,
      shouldCreateLastBidPriceIfNotExists,
      accounts,
      args
    );
  }

  async sellInstantSaleTx(
    accounts: {
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    args: { tokenSize?: number },
    shouldCreateLastBidPriceIfNotExists = false
  ) {
    return this.sell(
      SaleType.InstantSale,
      shouldCreateLastBidPriceIfNotExists,
      accounts,
      args
    );
  }

  async sellAcceptOfferTx(
    accounts: {
      buyerReceiptTokenAccount?: PublicKey;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
      walletBuyer: PublicKey;
      walletCreator: PublicKey;
      walletSeller: PublicKey;
    },
    args: { tokenSize?: number },
    remainingAccounts?: Array<AccountMeta>
  ) {
    // For accepting offers, we don't need to do anything in the `sell` ix
    // so we just create the trade state to indicate that the seller authorizes
    // the offer acceptance
    const {
      buyerReceiptTokenAccount,
      tokenAccount,
      tokenMint,
      wallet,
      walletBuyer,
      walletCreator,
      walletSeller,
      priceInLamports,
    } = accounts;
    const [[tradeStateAccountAddress], tradeStateIx, executeSaleTx] =
      await Promise.all([
        this.findTradeState(wallet, tokenAccount, tokenMint, priceInLamports),
        this.createTradeState(
          {
            tokenAccount,
            tokenMint,
            wallet,
          },
          {
            priceInLamports,
            saleType: SaleType.Offer,
            tokenSize: args.tokenSize,
          }
        ),
        this.executeSaleV2Tx(
          {
            buyerPriceInLamports: priceInLamports,
            buyerReceiptTokenAccount,
            sellerPriceInLamports: priceInLamports,
            tokenAccount,
            tokenMint,
            wallet,
            walletBuyer,
            walletCreator,
            walletSeller,
          },
          args,
          remainingAccounts
        ),
      ]);
    const tradeStateAccount =
      await this.program.provider.connection.getAccountInfo(
        tradeStateAccountAddress
      );

    if (tradeStateAccount == null) {
      return ixToTx(tradeStateIx).add(...executeSaleTx.instructions);
    }

    return executeSaleTx;
  }

  private async sellAndCancel(
    saleType: SaleType,
    {
      oldPriceInLamports,
      priceInLamports,
      tokenAccount,
      tokenMint,
      wallet,
    }: {
      oldPriceInLamports: number;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    { tokenSize = 1 }: { tokenSize?: number }
  ) {
    const [cancelTradeState] = await this.findTradeState(
      wallet,
      tokenAccount,
      tokenMint,
      oldPriceInLamports
    );
    const cancelTradeStateAccountInfo =
      await this.program.provider.connection.getAccountInfo(
        cancelTradeState,
        "finalized"
      );

    const cancelIx =
      cancelTradeStateAccountInfo == null
        ? null
        : await auctionHouseCancelV2Ix(
            {
              auctionHouse: this.auctionHouse,
              auctionHouseProgramId: this.program.programId,
              authority: this.walletAuthority,
              feeAccount: this.feeAccount,
              priceInLamports: oldPriceInLamports,
              program: this.program,
              tokenAccount,
              tokenMint,
              treasuryMint: this.treasuryMint,
              wallet,
            },
            { tokenSize }
          );

    const sellTx = await this.sell(
      saleType,
      false,
      {
        priceInLamports,
        tokenAccount,
        tokenMint,
        wallet,
      },
      { tokenSize }
    );

    const tx = new Transaction();
    tx.add(...filterNulls([cancelIx, ...sellTx.instructions]));

    return tx;
  }

  async sellAndCancelTx(
    accounts: {
      oldPriceInLamports: number;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    args: { tokenSize?: number }
  ) {
    return this.sellAndCancel(SaleType.Auction, accounts, args);
  }

  async sellInstantSaleAndCancelTx(
    accounts: {
      oldPriceInLamports: number;
      priceInLamports: number;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    args: { tokenSize?: number }
  ) {
    return this.sellAndCancel(SaleType.InstantSale, accounts, args);
  }

  async setEditionDistributorAntiBotProtectionEnabledTx(
    accounts: {
      mint: PublicKey;
    },
    args: {
      antiBotProtectionEnabled: boolean;
    }
  ) {
    const ix =
      await auctionHouseSetEditionDistributorAntiBotProtectionEnabledIx(
        {
          auctionHouse: this.auctionHouse,
          authority: this.walletAuthority,
          mint: accounts.mint,
          program: this.program,
        },
        args
      );

    return ixToTx(ix);
  }

  async setEditionDistributorLimitPerAddressTx(
    accounts: {
      mint: PublicKey;
    },
    args: {
      limitPerAddress: number;
    }
  ) {
    const ix = await auctionHouseSetEditionDistributorLimitPerAddressIx(
      {
        auctionHouse: this.auctionHouse,
        authority: this.walletAuthority,
        mint: accounts.mint,
        program: this.program,
      },
      args
    );

    return ixToTx(ix);
  }

  async setPreviousBidderTx(
    {
      tokenMint,
    }: {
      tokenMint: PublicKey;
    },
    { bidder }: { bidder: Maybe<PublicKey> }
  ) {
    const ix = await auctionHouseSetPreviousBidderIx(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        program: this.program,
        tokenMint,
      },
      { bidder }
    );

    return ixToTx(ix);
  }

  async setHasBeenSoldTx(
    {
      tokenMint,
    }: {
      tokenMint: PublicKey;
    },
    { hasBeenSold }: { hasBeenSold: boolean }
  ) {
    const ix = await auctionHouseSetHasBeenSoldIx(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        program: this.program,
        tokenMint,
      },
      { hasBeenSold }
    );

    return ixToTx(ix);
  }

  async setTickSizeTx(
    {
      owner,
      tokenAccount,
      tokenMint,
    }: {
      owner: PublicKey;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
    },
    { tickSizeConstantInLamports }: { tickSizeConstantInLamports: number }
  ) {
    const ix = await auctionHouseSetTickSizeIx(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        owner,
        program: this.program,
        tokenAccount,
        tokenMint,
        treasuryMint: this.treasuryMint,
      },
      { tickSizeConstantInLamports }
    );

    return ixToTx(ix);
  }

  async thawDelegatedAccountTx({
    tokenAccount,
    tokenMint,
    walletSeller,
  }: {
    tokenAccount: PublicKey;
    tokenMint: PublicKey;
    walletSeller: PublicKey;
  }) {
    const thawDelegatedAccountIx = await auctionHouseThawDelegatedAccountIx({
      auctionHouse: this.auctionHouse,
      auctionHouseProgramId: this.program.programId,
      authority: this.walletAuthority,
      program: this.program,
      tokenAccount,
      tokenMint,
      walletSeller,
    });

    return ixToTx(thawDelegatedAccountIx);
  }

  async transferMasterEditionToDistributorTx({
    mint,
    sourceTokenAccount,
    wallet,
  }: {
    mint: PublicKey;
    sourceTokenAccount: PublicKey;
    wallet: PublicKey;
  }) {
    const [editionDistributor] = findEditionDistributor(
      mint,
      this.program.programId
    );
    const [editionDistributorAta] = findAtaPda(editionDistributor, mint);

    const transferMasterEditionIx = await createTransferAtaIx(
      editionDistributorAta,
      sourceTokenAccount,
      wallet,
      [],
      1
    );

    const ataAccountInfo =
      await this.program.provider.connection.getAccountInfo(
        editionDistributorAta
      );

    // It's possible the ATA is already created, in which case we
    // don't need the createAtaIx here.
    if (ataAccountInfo == null) {
      const createDistributorAtaIx = await createAtaIx(
        mint,
        editionDistributor,
        wallet
      );
      return ixsToTx([createDistributorAtaIx, transferMasterEditionIx]);
    } else {
      return ixToTx(transferMasterEditionIx);
    }
  }

  async withdrawFromTreasuryTx(
    {
      treasuryWithdrawalDestination,
    }: {
      treasuryWithdrawalDestination: PublicKey;
    },
    { amount }: { amount: number }
  ) {
    const ix = await auctionHouseWithdrawFromTreasuryIx(
      {
        auctionHouse: this.auctionHouse,
        authority: this.walletAuthority,
        program: this.program,
        treasuryAccount: this.treasuryAccount,
        treasuryMint: this.treasuryMint,
        treasuryWithdrawalDestination,
      },
      { amount }
    );
    return ixToTx(ix);
  }

  async updateEditionDistributorTx(
    {
      mint,
      owner,
    }: {
      mint: PublicKey;
      owner: PublicKey;
    },
    {
      allowlistSalePrice,
      allowlistSaleStartTime,
      saleEndTime,
      newOwner,
      priceFunctionType,
      priceParams,
      startingPriceLamports,
      publicSaleStartTime,
    }: {
      allowlistSalePrice: Maybe<number>;
      allowlistSaleStartTime: Maybe<number>;
      newOwner?: MaybeUndef<PublicKey>;
      priceFunctionType?: MaybeUndef<PriceFunctionType>;
      priceParams?: MaybeUndef<Array<number>>;
      publicSaleStartTime: Maybe<number>;
      saleEndTime: Maybe<number>;
      startingPriceLamports?: MaybeUndef<number>;
    }
  ) {
    const ix = await auctionHouseUpdateEditionDistributorIx(
      {
        mint,
        owner,
        program: this.program,
        treasuryMint: this.treasuryMint,
      },
      {
        allowlistSalePrice,
        allowlistSaleStartTime,
        newOwner,
        priceFunctionType,
        priceParams,
        publicSaleStartTime,
        saleEndTime,
        startingPriceLamports,
      }
    );
    return ixToTx(ix);
  }

  async updateTx(
    {
      feeWithdrawalDestination,
      newAuthority,
      payer,
      treasuryWithdrawalDestination,
      treasuryWithdrawalDestinationOwner,
    }: {
      feeWithdrawalDestination: PublicKey;
      newAuthority: PublicKey;
      payer: PublicKey;
      treasuryWithdrawalDestination: PublicKey;
      treasuryWithdrawalDestinationOwner: PublicKey;
    },
    {
      basisPoints,
      requiresSignOff,
      canChangePrice,
      basisPointsSecondary,
      payAllFees,
    }: {
      basisPoints: number;
      basisPointsSecondary: number;
      canChangePrice: boolean;
      payAllFees: boolean;
      requiresSignOff: boolean;
    }
  ) {
    const ix = await auctionHouseUpdateIx(
      {
        auctionHouse: this.auctionHouse,
        authority: this.walletAuthority,
        feeWithdrawalDestination,
        newAuthority,
        payer,
        program: this.program,
        treasuryMint: this.treasuryMint,
        treasuryWithdrawalDestination,
        treasuryWithdrawalDestinationOwner,
      },
      {
        basisPoints,
        basisPointsSecondary,
        canChangePrice,
        payAllFees,
        requiresSignOff,
      }
    );
    return ixToTx(ix);
  }

  async withdrawTx(
    {
      receiptAccount,
      tokenMint,
      wallet,
    }: {
      receiptAccount?: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    { amount }: { amount: number }
  ) {
    const ix = await auctionHouseWithdrawIx(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        program: this.program,
        receiptAccount:
          receiptAccount ??
          (await getWalletIfNativeElseAta(wallet, this.treasuryMint)),
        tokenMint,
        treasuryMint: this.treasuryMint,
        wallet,
      },
      { amount }
    );
    return ixToTx(ix);
  }

  async withdrawAndCancelTx(
    {
      receiptAccount,
      tokenAccount,
      tokenMint,
      wallet,
    }: {
      receiptAccount: PublicKey;
      tokenAccount: PublicKey;
      tokenMint: PublicKey;
      wallet: PublicKey;
    },
    {
      amount,
      tokenSize = 1,
    }: {
      amount: number;
      tokenSize?: number;
    }
  ) {
    const cancelIx = await auctionHouseCancelV2Ix(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        feeAccount: this.feeAccount,
        priceInLamports: amount,
        program: this.program,
        tokenAccount,
        tokenMint,
        treasuryMint: this.treasuryMint,
        wallet,
      },
      { tokenSize }
    );

    const withdrawIx = await auctionHouseWithdrawIx(
      {
        auctionHouse: this.auctionHouse,
        auctionHouseProgramId: this.program.programId,
        authority: this.walletAuthority,
        program: this.program,
        receiptAccount,
        tokenMint,
        treasuryMint: this.treasuryMint,
        wallet,
      },
      { amount }
    );

    const tx = new Transaction();
    tx.add(...filterNulls([cancelIx, withdrawIx]));

    return tx;
  }

  async withdrawBonkTx({
    bonkTokenAccount,
    mint,
    tokenReceiver,
  }: {
    bonkTokenAccount: PublicKey;
    mint: PublicKey;
    tokenReceiver: PublicKey;
  }) {
    const ix = await auctionHouseWithdrawBonkIx({
      auctionHouse: this.auctionHouse,
      authority: this.walletAuthority,
      bonkTokenAccount,
      mint,
      program: this.program,
      tokenReceiver,
    });
    return ixToTx(ix);
  }

  async appendEditionAllowlistMerkleRootsTx(
    { mint }: { mint: PublicKey },
    { merkleRoots }: { merkleRoots: Array<MerkleRoot> }
  ) {
    const ix = await auctionHouseAppendEditionAllowlistMerkleRootsIx(
      {
        auctionHouse: this.auctionHouse,
        authority: this.walletAuthority,
        mint,
        program: this.program,
      },
      {
        merkleRoots,
      }
    );
    return ixToTx(ix);
  }

  async clearEditionAllowlistMerkleRootsTx({
    mint,
  }: {
    mint: PublicKey;
  }): Promise<Maybe<Transaction>> {
    const [editionDistributorPda] = findEditionDistributor(
      mint,
      this.program.programId
    );
    const [editionAllowlistSettingsPda] = findEditionAllowlistSettingsAccount(
      editionDistributorPda,
      this.program.programId
    );
    try {
      // This will throw if the account doesn't exist.
      await this.program.account.editionAllowlistSettings.fetch(
        editionAllowlistSettingsPda,
        "confirmed"
      );
    } catch (err) {
      // The account lookup will throw if the account doesn't exist yet.
      return null;
    }

    const ix = await auctionHouseClearEditionAllowlistMerkleRootsIx({
      auctionHouse: this.auctionHouse,
      authority: this.walletAuthority,
      mint,
      program: this.program,
    });
    return ixToTx(ix);
  }

  async closeEditionAllowlistSettingsAccountTx({ mint }: { mint: PublicKey }) {
    const ix = await auctionHouseCloseEditionAllowlistSettingsAccountIx({
      auctionHouse: this.auctionHouse,
      authority: this.walletAuthority,
      mint,
      program: this.program,
    });
    return ixToTx(ix);
  }

  ///
  /// PDAs
  ///
  async findBuyerEscrow(wallet: PublicKey, tokenMint: PublicKey) {
    return findAuctionHouseBuyerEscrow(
      this.auctionHouse,
      wallet,
      tokenMint,
      this.program.programId
    );
  }

  async findEditionDistributor(tokenMint: PublicKey) {
    return findEditionDistributor(tokenMint, this.program.programId);
  }

  async findLastBidPrice(tokenMint: PublicKey) {
    return findLastBidPrice(tokenMint, this.program.programId);
  }

  async findProgramAsSigner() {
    return findAuctionHouseProgramAsSigner(this.program.programId);
  }

  async findTradeState(
    wallet: PublicKey,
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    priceInLamports: number,
    tokenSize = 1
  ) {
    return getTradeState({
      auctionHouse: this.auctionHouse,
      auctionHouseProgramId: this.program.programId,
      priceInLamports,
      tokenAccount,
      tokenMint,
      tokenSize,
      treasuryMint: this.treasuryMint,
      wallet,
    });
  }

  ///
  /// Static
  ///
  static getEditionNumberFromTx(tx: ParsedTransactionWithMeta): number | null {
    const logs = tx.meta?.logMessages;
    if (logs == null) {
      return null;
    }

    const logLine = logs.find((line) => line.includes("Bought edition #"));
    if (logLine == null) {
      return null;
    }

    const regex = /Bought edition #(\d+)/;
    const matches = logLine.match(regex);
    if (matches == null || matches.length < 2) {
      return null;
    }

    return Number(matches[1]);
  }
}
