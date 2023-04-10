import {
  arePublicKeysEqual,
  deserializeMerkleProof,
  findAtaPda,
  findEditionMarkerPda,
  findEditionPda,
  findTokenMetadataPda,
  getMasterEditionSupply,
  Maybe,
  TOKEN_METADATA_PROGRAM_ID,
} from "@formfunction-hq/formfunction-program-shared";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import findAuctionHouseFeeAccount from "solana/pdas/findAuctionHouseFeeAccount";
import findAuctionHouseTreasuryAccount from "solana/pdas/findAuctionHouseTreasuryAccount";
import findEditionAllowlistSettingsAccount from "solana/pdas/findEditionAllowlistSettingsAccount";
import findEditionBuyerInfoAccountPda from "solana/pdas/findEditionBuyerInfoAccountPda";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import getWalletIfNativeElseAta from "solana/utils/getWalletIfNativeElseAta";
import AuctionHouseProgram from "types/AuctionHouseProgram";
import MerkleAllowlistBuyerWithProof from "types/merkle-tree/MerkleAllowlistBuyerWithProof";

function getIxMerkleAllowlistProofData(
  buyerWithAllowlistProofData: Maybe<MerkleAllowlistBuyerWithProof>
) {
  if (buyerWithAllowlistProofData == null) {
    return null;
  }

  const { amount, serializedProof, merkleTreeIndex } =
    buyerWithAllowlistProofData;

  return {
    amount,
    proof: deserializeMerkleProof(serializedProof).map((val) => [...val]),
    rootIndexForProof: merkleTreeIndex,
  };
}

type Accounts = {
  antiBotAuthority: PublicKey;
  auctionHouse: PublicKey;
  authority: PublicKey;
  buyer: PublicKey;
  mint: PublicKey;
  newMint: PublicKey;
  program: AuctionHouseProgram;
  treasuryMint: PublicKey;
};

type Args = {
  buyerWithAllowlistProofData: Maybe<MerkleAllowlistBuyerWithProof>;
  priceInLamports: number;
};

export default async function auctionHouseBuyEditionV2Ix(
  {
    antiBotAuthority,
    auctionHouse,
    authority,
    buyer,
    mint,
    newMint,
    program,
    treasuryMint,
  }: Accounts,
  { buyerWithAllowlistProofData, priceInLamports }: Args,
  // Creators
  remainingAccounts: Array<AccountMeta>
): Promise<TransactionInstruction> {
  const { programId } = program;
  const masterEditionSupply = await getMasterEditionSupply(
    program.provider.connection,
    mint
  );

  // This may not be the edition that is actually minted!
  // But we need this to calculate findEditionMarker
  const edition = masterEditionSupply + 1;

  const [editionDistributor] = findEditionDistributor(mint, programId);
  const [masterEdition, masterEditionBump] = findEditionPda(mint);
  const [masterEditionMetadata] = findTokenMetadataPda(mint);
  const [limitedEdition] = findEditionPda(newMint);
  const [limitedEditionMetadata] = findTokenMetadataPda(newMint);
  const [editionMarker] = findEditionMarkerPda(mint, new BN(edition));
  const [treasuryAccount] = findAuctionHouseTreasuryAccount(
    auctionHouse,
    programId
  );
  const [distributorTokenAccount] = findAtaPda(editionDistributor, mint);
  const [buyerTokenAccount] = findAtaPda(buyer, newMint);
  const [feeAccount] = findAuctionHouseFeeAccount(auctionHouse, programId);
  const [editionBuyerInfoAccount, editionBuyerInfoAccountBump] =
    findEditionBuyerInfoAccountPda(mint, buyer, programId);
  const [editionAllowlistSettings] = findEditionAllowlistSettingsAccount(
    editionDistributor,
    programId
  );

  const editionDistributorAccountInfo =
    await program.account.editionDistributor.fetch(
      editionDistributor,
      "confirmed"
    );
  const owner = editionDistributorAccountInfo.owner;

  const ix = await program.methods
    .buyEditionV2(
      masterEditionBump,
      new BN(edition),
      new BN(priceInLamports),
      editionBuyerInfoAccountBump,
      getIxMerkleAllowlistProofData(buyerWithAllowlistProofData)
    )
    .accounts({
      antiBotAuthority,
      ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      auctionHouse,
      auctionHouseFeeAccount: feeAccount,
      auctionHouseTreasury: treasuryAccount,
      authority,
      buyer,
      buyerPaymentTokenAccount: await getWalletIfNativeElseAta(
        buyer,
        treasuryMint
      ),
      buyerTokenAccount,
      editionAllowlistSettings,
      editionBuyerInfoAccount,
      editionDistributor,
      editionMarkerPda: editionMarker,
      limitedEditionMetadata,
      limitedEditionMint: newMint,
      limitedEditionPda: limitedEdition,
      masterEditionMetadata,
      masterEditionPda: masterEdition,
      masterEditionTokenAccount: distributorTokenAccount,
      mint,
      owner,
      rent: SYSVAR_RENT_PUBKEY,
      sellerPaymentReceiptTokenAccount: await getWalletIfNativeElseAta(
        owner,
        treasuryMint
      ),
      systemProgram: SystemProgram.programId,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      treasuryMint,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  // If anti-bot measures are enabled, we want to change the antiBotAuthority
  // account such that it is expected to be a signer.
  ix.keys = ix.keys.map((key) => {
    if (
      editionDistributorAccountInfo.antiBotProtectionEnabled &&
      arePublicKeysEqual(key.pubkey, antiBotAuthority)
    ) {
      return { ...key, isSigner: true };
    }

    return key;
  });

  return ix;
}
