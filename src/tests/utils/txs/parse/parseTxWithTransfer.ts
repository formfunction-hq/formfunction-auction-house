import { Maybe } from "@formfunction-hq/formfunction-program-shared";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
  PublicKey,
} from "@solana/web3.js";
import NftTransactionType from "tests/types/enums/NftTransactionType";
import NftTransaction from "tests/types/NftTransaction";

function isTransferIx(
  ix: ParsedInstruction | PartiallyDecodedInstruction
): boolean {
  return (
    ix.programId.equals(TOKEN_PROGRAM_ID) &&
    ["transfer", "transferChecked"].includes(
      (ix as ParsedInstruction).parsed.type
    )
  );
}

export default function parseTxWithTransfer(
  tx: ParsedTransactionWithMeta,
  signature: string,
  tokenMint: PublicKey
): Maybe<NftTransaction> {
  const ixs = tx.transaction.message.instructions;
  const transferIx = ixs.find((ix) => isTransferIx(ix));

  const allInnerTxs = tx.meta?.innerInstructions?.reduce(
    (acc: Array<ParsedInstruction | PartiallyDecodedInstruction>, currVal) => [
      ...acc,
      ...currVal.instructions,
    ],
    []
  );
  const innerTransferIx = allInnerTxs?.find((ix) => isTransferIx(ix));

  if (transferIx == null && innerTransferIx == null) {
    return null;
  }

  const postTokenBalances = tx.meta!.postTokenBalances!;
  const preTokenBalances = tx.meta!.preTokenBalances!;

  const fromAddress = preTokenBalances.find(
    (balance) =>
      balance.uiTokenAmount.uiAmount != null &&
      balance.uiTokenAmount.uiAmount > 0 &&
      balance.mint === tokenMint.toString()
  )!.owner;
  const toAddress = postTokenBalances.find(
    (balance) =>
      balance.uiTokenAmount.uiAmount != null &&
      balance.uiTokenAmount.uiAmount > 0 &&
      balance.mint === tokenMint.toString()
  )!.owner;

  return {
    blockTime: tx.blockTime,
    fromAddress: fromAddress!.toString(),
    mint: tokenMint.toString(),
    toAddress: toAddress!.toString(),
    txid: signature,
    type: NftTransactionType.Transferred,
  };
}
