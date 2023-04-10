import { Maybe } from "@formfunction-hq/formfunction-program-shared";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";
import NftTransactionType from "tests/types/enums/NftTransactionType";
import NftTransaction from "tests/types/NftTransaction";

function isCreateMintIx(
  ix: ParsedInstruction | PartiallyDecodedInstruction
): boolean {
  return (
    ix.programId.equals(TOKEN_PROGRAM_ID) &&
    (ix as ParsedInstruction).parsed.type === "initializeMint"
  );
}

export default function parseCreateMintTx(
  tx: ParsedTransactionWithMeta,
  signature: string
): Maybe<NftTransaction> {
  const ixs = tx.transaction.message.instructions;
  const createMintIx = ixs.find((ix) => isCreateMintIx(ix));

  if (createMintIx == null) {
    return null;
  }

  const mintAuthority = (createMintIx as ParsedInstruction).parsed.info
    .mintAuthority;
  const mint = (createMintIx as ParsedInstruction).parsed.info.mint;

  return {
    blockTime: tx.blockTime,
    fromAddress: mintAuthority,
    mint,
    toAddress: mintAuthority,
    txid: signature,
    type: NftTransactionType.Minted,
  };
}
