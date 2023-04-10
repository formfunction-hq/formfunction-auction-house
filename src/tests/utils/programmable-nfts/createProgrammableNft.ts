import {
  expectPublicKeysEqual,
  findAtaPda,
  findEditionPda,
  findTokenMetadataPda,
  ixToTx,
} from "@formfunction-hq/formfunction-program-shared";
import { PROGRAM_ID as TOKEN_AUTH_RULES_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import {
  AssetData,
  createCreateInstruction,
  CreateInstructionAccounts,
  createMintInstruction,
  Metadata,
  MintInstructionArgs,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import findTokenRecordPda from "tests/utils/programmable-nfts/findTokenRecordPda";
import getProgrammableNftAssetData from "tests/utils/programmable-nfts/getProgrammableNftAssetData";
import getProgrammableNftCreateArgs from "tests/utils/programmable-nfts/getProgrammableNftCreateArgs";
import sendTransactionWithWallet from "tests/utils/txs/sendTransactionWithWallet";

function removeNullBytesFromString(str: string): string {
  return str.replace(/\0+/, "");
}

type MintProgrammableNftResult = {
  masterEdition: PublicKey;
  metadata: PublicKey;
  metadataAccount: Metadata;
  mint: PublicKey;
};

// TODO[@]: Make more configurable as needed.
export default async function createProgrammableNft({
  connection,
  creator,
  metadataCreators,
}: {
  connection: Connection;
  creator: Keypair;
  metadataCreators: Array<{
    address: PublicKey;
    share: number;
    verified: boolean;
  }>;
}): Promise<MintProgrammableNftResult> {
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const [metadata] = findTokenMetadataPda(mint);
  const [masterEdition] = findEditionPda(mint);

  const accounts: CreateInstructionAccounts = {
    authority: creator.publicKey,
    masterEdition,
    metadata,
    mint,
    payer: creator.publicKey,
    splTokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    updateAuthority: creator.publicKey,
  };

  const assetData: AssetData = getProgrammableNftAssetData({
    creators: metadataCreators,
  });

  const printSupply = 0;
  const createIx = createCreateInstruction(accounts, {
    createArgs: getProgrammableNftCreateArgs({ assetData, printSupply }),
  });

  // Need to make the mint account a signer. Not sure why it's not. Metaplex also
  // does this in their tests.
  for (let i = 0; i < createIx.keys.length; i++) {
    if (
      createIx.keys[i].pubkey.toBase58() === mintKeypair.publicKey.toBase58()
    ) {
      createIx.keys[i].isSigner = true;
      createIx.keys[i].isWritable = true;
    }
  }

  const tx = ixToTx(createIx);
  await sendTransactionWithWallet(connection, tx, creator, [mintKeypair]);

  const metadataAccount = await Metadata.fromAccountAddress(
    connection,
    metadata
  );

  const [ata] = findAtaPda(creator.publicKey, mint);
  const [tokenRecord] = findTokenRecordPda(mint, ata);

  const mintArgs: MintInstructionArgs = {
    mintArgs: {
      __kind: "V1",
      amount: 1,
      authorizationData: null,
    },
  };

  const mintIx = createMintInstruction(
    {
      authority: creator.publicKey,
      authorizationRules: undefined,
      authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
      masterEdition,
      metadata,
      mint,
      payer: creator.publicKey,
      splAtaProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      splTokenProgram: TOKEN_PROGRAM_ID,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      token: ata,
      tokenOwner: creator.publicKey,
      tokenRecord,
    },
    mintArgs
  );

  const mintTx = ixToTx(mintIx);
  await sendTransactionWithWallet(connection, mintTx, creator);

  expectPublicKeysEqual(metadataAccount.updateAuthority, creator.publicKey);
  expectPublicKeysEqual(metadataAccount.mint, mint);
  expect(metadataAccount.primarySaleHappened).toBe(
    assetData.primarySaleHappened
  );
  expect(metadataAccount.isMutable).toBe(assetData.isMutable);
  expect(metadataAccount.data.sellerFeeBasisPoints).toBe(
    assetData.sellerFeeBasisPoints
  );

  expect(removeNullBytesFromString(metadataAccount.data.name)).toEqual(
    assetData.name
  );
  expect(removeNullBytesFromString(metadataAccount.data.symbol)).toEqual(
    assetData.symbol
  );
  expect(removeNullBytesFromString(metadataAccount.data.uri)).toEqual(
    assetData.uri
  );

  return {
    masterEdition,
    metadata,
    metadataAccount,
    mint,
  };
}
