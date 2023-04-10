import {
  ANTI_BOT_DEV_AUTHORITY_KEYPAIR,
  createMasterEdition,
  createMetadata,
  createNftMint,
  createTokenAccount,
  findAtaPda,
  findEditionPda,
  findTokenMetadataPda,
  getTokenAccountInfo,
  logIfDebug,
  mintTo,
  requestAirdrops,
} from "@formfunction-hq/formfunction-program-shared";
import { Keypair, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import {
  BASIS_POINTS,
  BASIS_POINTS_SECONDARY,
} from "tests/constants/AuctionHouse";
import createAuctionHouse from "tests/utils/createAuctionHouse";
import fundSplTokenAtas from "tests/utils/fundSplTokenAccount";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import getEditionDistributorPriceFunction from "tests/utils/getEditionDistributorPriceFunction";
import getProgram from "tests/utils/getProgram";
import getTestMetadata from "tests/utils/getTestMetadata";
import getTreasuryMint from "tests/utils/getTreasuryMint";
import getTreasuryWithdrawalDestination from "tests/utils/getTreasuryWithdrawalDestination";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";
import PriceFunctionType from "types/enum/PriceFunctionType";

const programCreator = Keypair.generate();
const program = getProgram(programCreator);

const connection = getConnectionForTest();

export default async function getEditionDistributorSetup({
  antiBotAuthority = ANTI_BOT_DEV_AUTHORITY_KEYPAIR.publicKey,
  antiBotProtectionEnabled = false,
  auctionHouseConfigArg,
  maxSupply = 10,
  multipleCreators = false,
  priceFunctionType,
  priceParams,
  limitPerAddress,
  publicSaleStartTime,
  saleEndTime,
  allowlistSalePrice,
  allowlistSaleStartTime,
  startingPriceLamports,
}: {
  allowlistSalePrice?: number;
  allowlistSaleStartTime?: number;
  antiBotAuthority?: PublicKey;
  antiBotProtectionEnabled?: boolean;
  auctionHouseConfigArg?: {
    basisPoints: number;
    basisPointsSecondary: number;
    treasuryWithdrawalDestinationOwner: PublicKey;
  };
  limitPerAddress?: number;
  maxSupply?: number;
  multipleCreators?: boolean;
  priceFunctionType: PriceFunctionType;
  priceParams: Array<number>;
  publicSaleStartTime?: number;
  saleEndTime?: number;
  startingPriceLamports: number;
}) {
  const auctionHouseConfig =
    auctionHouseConfigArg != null
      ? {
          ...auctionHouseConfigArg,
          ...(await getTreasuryWithdrawalDestination(
            auctionHouseConfigArg.treasuryWithdrawalDestinationOwner
          )),
        }
      : {
          basisPoints: BASIS_POINTS,
          basisPointsSecondary: BASIS_POINTS_SECONDARY,
          ...(await getTreasuryWithdrawalDestination()),
        };
  const nftOwner = Keypair.generate();
  const collaborator = Keypair.generate();
  await requestAirdrops({
    connection: connection,
    wallets: [nftOwner, collaborator, programCreator],
  });
  await fundSplTokenAtas(connection, [nftOwner, collaborator]);
  const auctionHouseSdk = AuctionHouseSdk.init(program, {
    antiBotAuthority,
    treasuryMint: await getTreasuryMint(),
    walletAuthority: programCreator.publicKey,
    walletCreator: programCreator.publicKey,
  });

  logIfDebug("creating mint");
  const tokenMint = await createNftMint(connection, nftOwner);
  logIfDebug("creating token account");
  const tokenAccount = await createTokenAccount(
    connection,
    tokenMint,
    nftOwner
  );
  logIfDebug("minting token");
  await mintTo(
    connection,
    tokenMint,
    tokenAccount,
    nftOwner.publicKey,
    [nftOwner],
    1
  );
  const [metadata] = findTokenMetadataPda(tokenMint);
  logIfDebug("creating metadata");
  const metadataData = multipleCreators
    ? getTestMetadata(
        { address: nftOwner.publicKey, share: 90, verified: true },
        { address: collaborator.publicKey, share: 10, verified: false }
      )
    : getTestMetadata({
        address: nftOwner.publicKey,
        share: 100,
        verified: true,
      });
  await createMetadata(
    connection,
    nftOwner,
    tokenMint,
    nftOwner.publicKey,
    nftOwner.publicKey,
    metadataData
  );
  const [editionPda] = findEditionPda(tokenMint);
  logIfDebug("creating master edition");
  await createMasterEdition(
    connection,
    nftOwner,
    editionPda,
    tokenMint,
    nftOwner.publicKey,
    nftOwner.publicKey,
    metadata,
    maxSupply
  );

  // Necessary for any following instructions which include the auction_house
  // account, such as SetEditionDistributorLimitPerAddress.
  await createAuctionHouse(
    connection,
    auctionHouseSdk,
    programCreator,
    auctionHouseConfig
  );

  logIfDebug("creating edition distributor tx");
  const tx = await auctionHouseSdk.createEditionDistributorTx(
    {
      mint: tokenMint,
      owner: nftOwner.publicKey,
      tokenAccount,
    },
    {
      allowlistSalePrice: allowlistSalePrice ?? null,
      allowlistSaleStartTime: allowlistSaleStartTime ?? null,
      antiBotProtectionEnabled,
      limitPerAddress,
      priceFunctionType,
      priceParams,
      publicSaleStartTime: publicSaleStartTime ?? null,
      saleEndTime: saleEndTime ?? null,
      startingPriceLamports,
    },
    // Transfer the NFT to the distributor
    true
  );
  await sendTransactionWithWallet(connection, tx, nftOwner);

  const [editionDistributor, editionDistributorBump] = findEditionDistributor(
    tokenMint,
    auctionHouseSdk.program.programId
  );
  const [editionDistributorAta] = findAtaPda(editionDistributor, tokenMint);
  const editionDistributorAtaAccountInfo = await getTokenAccountInfo(
    connection,
    editionDistributorAta
  );
  // NFT should have been transferred to distributor's ATA
  expect(Number(editionDistributorAtaAccountInfo.amount)).toEqual(1);

  const [editionDistributorAccount, priceFunction] = await Promise.all([
    auctionHouseSdk.program.account.editionDistributor.fetch(
      editionDistributor
    ),
    getEditionDistributorPriceFunction(
      auctionHouseSdk.program,
      editionDistributor
    ),
  ]);
  logIfDebug(
    "editionDistributorAccount",
    JSON.stringify(editionDistributorAccount)
  );
  expect(editionDistributorAccount.bump).toEqual(editionDistributorBump);
  expect(editionDistributorAccount.masterEditionMint.toString()).toEqual(
    tokenMint.toString()
  );
  expect(editionDistributorAccount.treasuryMint?.toString()).toEqual(
    (await getTreasuryMint()).toString()
  );
  expect(priceFunction.startingPriceLamports).toEqual(startingPriceLamports);
  expect(priceFunction.priceFunctionType).toEqual(priceFunctionType);
  expect(priceFunction.params).toEqual(priceParams);

  const auctionHouseAccount = await program.account.auctionHouse.fetch(
    auctionHouseSdk.auctionHouse
  );

  return {
    auctionHouseAccount,
    auctionHouseSdk,
    editionDistributor,
    metadataData,
    nftOwner,
    nftOwnerTokenAccount: tokenAccount,
    programCreator,
    remainingAccounts: metadataData.creators!.map((creator) => ({
      isSigner: false,
      isWritable: true,
      pubkey: new PublicKey(creator.address),
    })),
    tokenMint,
  };
}
