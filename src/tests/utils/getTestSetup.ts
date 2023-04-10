import {
  ANTI_BOT_DEV_AUTHORITY_KEYPAIR,
  createMasterEdition,
  createMetadata,
  createNftMint,
  createTokenAccount,
  findEditionPda,
  findTokenMetadataPda,
  getTokenAmount,
  logIfDebug,
  mintTo,
  requestAirdrops,
} from "@formfunction-hq/formfunction-program-shared";
import { DataV2 } from "@metaplex-foundation/mpl-token-metadata";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import createAuctionHouse from "tests/utils/createAuctionHouse";
import fundSplTokenAtas from "tests/utils/fundSplTokenAccount";
import getTestMetadata from "tests/utils/getTestMetadata";
import getTestWallets from "tests/utils/getTestWallets";
import getTreasuryWithdrawalDestination from "tests/utils/getTreasuryWithdrawalDestination";
import AuctionHouseProgram from "types/AuctionHouseProgram";

export default async function getTestSetup(
  connection: Connection,
  auctionHouseConfig: {
    antiBotAuthority?: PublicKey;
    basisPoints: number;
    basisPointsSecondary: number;
    creator: AuctionHouseProgram;
    feeWithdrawalDestination?: PublicKey;
    treasuryMint: PublicKey;
    treasuryWithdrawalDestinationOwner?: PublicKey;
  },
  programCreatorWallet: Keypair,
  numSellers?: number,
  numBuyers?: number,
  tokenMintAddress?: PublicKey
): Promise<
  [
    AuctionHouseSdk,
    PublicKey,
    PublicKey,
    PublicKey,
    Array<Keypair>,
    Array<Keypair>,
    DataV2
  ]
> {
  if (numSellers != null && numSellers < 2) {
    throw new Error("numSellers must be at least 2");
  }
  if (numBuyers != null && numBuyers < 2) {
    throw new Error("numBuyers must be at least 2");
  }

  const {
    antiBotAuthority,
    creator: auctionHouseProgramCreator,
    basisPoints,
    basisPointsSecondary,
    feeWithdrawalDestination,
    treasuryWithdrawalDestinationOwner: treasuryWithdrawalDestinationOwnerArg,
    treasuryMint,
  } = auctionHouseConfig;
  const auctionHouseSdk = AuctionHouseSdk.init(auctionHouseProgramCreator, {
    antiBotAuthority:
      antiBotAuthority ?? ANTI_BOT_DEV_AUTHORITY_KEYPAIR.publicKey,
    treasuryMint: treasuryMint,
    walletAuthority: programCreatorWallet.publicKey,
    walletCreator: programCreatorWallet.publicKey,
  });

  const [sellers, buyers] = await Promise.all([
    getTestWallets(connection, numSellers ?? 2),
    getTestWallets(connection, numBuyers ?? 2),
  ]);

  //
  // Fund accounts
  //
  await requestAirdrops({ connection, wallets: [...sellers, ...buyers] });
  await fundSplTokenAtas(connection, [...sellers, ...buyers]);
  //
  // Auction house setup
  //
  await connection.requestAirdrop(
    auctionHouseSdk.feeAccount,
    5 * LAMPORTS_PER_SOL
  );
  const seller = sellers[0];
  const buyer = buyers[0];

  //
  // Token setup
  //
  let tokenMint = tokenMintAddress;
  if (tokenMint == null) {
    logIfDebug("creating token mint");
    tokenMint = await createNftMint(connection, seller);
    logIfDebug(`token mint created at ${tokenMint.toString()}`, tokenMint);
  }

  logIfDebug("creating token account for seller");
  const tokenAccount = await createTokenAccount(connection, tokenMint, seller);

  logIfDebug("creating token account for buyer");
  const buyerTokenAccount = await createTokenAccount(
    connection,
    tokenMint,
    buyer
  );

  const [metadata] = findTokenMetadataPda(tokenMint);
  const metadataExists = await connection.getAccountInfo(metadata);
  const metadataData = getTestMetadata(
    { address: sellers[0].publicKey, share: 90, verified: true },
    { address: sellers[1].publicKey, share: 10, verified: false }
  );
  if (!metadataExists) {
    logIfDebug("creating metadata");
    await createMetadata(
      connection,
      seller,
      tokenMint,
      seller.publicKey,
      seller.publicKey,
      metadataData
    );
    logIfDebug("after creating metadata");
  }

  const tokenAmount = await getTokenAmount(connection, tokenAccount);
  if (tokenAmount < 1) {
    logIfDebug(`minting one token to ${tokenAccount.toString()}`);
    await mintTo(
      connection,
      tokenMint,
      tokenAccount,
      seller.publicKey,
      [seller],
      1
    );
  }

  const [editionPda] = findEditionPda(tokenMint);
  const masterEditionExists = await connection.getAccountInfo(editionPda);
  if (!masterEditionExists) {
    logIfDebug(`creating master edition ${editionPda}`);
    await createMasterEdition(
      connection,
      seller,
      editionPda,
      tokenMint,
      seller.publicKey,
      seller.publicKey,
      metadata
    );
  }

  const { treasuryWithdrawalDestination, treasuryWithdrawalDestinationOwner } =
    await getTreasuryWithdrawalDestination(
      treasuryWithdrawalDestinationOwnerArg ?? undefined
    );
  await createAuctionHouse(connection, auctionHouseSdk, programCreatorWallet, {
    basisPoints,
    basisPointsSecondary,
    feeWithdrawalDestination,
    treasuryWithdrawalDestination,
    treasuryWithdrawalDestinationOwner,
  });

  return [
    auctionHouseSdk,
    buyerTokenAccount,
    tokenAccount,
    tokenMint,
    sellers,
    buyers,
    metadataData,
  ];
}
