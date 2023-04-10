import { Maybe } from "@formfunction-hq/formfunction-program-shared";
import { BorshInstructionCoder } from "@project-serum/anchor";
import {
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
  PublicKey,
} from "@solana/web3.js";
import { AUCTION_HOUSE_PROGRAM_ID } from "tests/constants/AuctionHouse";
import NftTransactionType from "tests/types/enums/NftTransactionType";
import NftTransaction from "tests/types/NftTransaction";
import getIdl from "tests/utils/getIdl";
import getAllInnerIxsWithIndices from "tests/utils/txs/getAllInnerIxsWithIndices";

// DO NOT CHANGE -- if you need to change this to fix tests, that means you will break
// parsing logic for existing sell txs. Reorder accounts instead to make sure token mint
// account stays in this position.
const TOKEN_MINT_POSITION = 8;

function isSellTx(
  ix: ParsedInstruction | PartiallyDecodedInstruction
): boolean {
  const ixCoder = new BorshInstructionCoder(getIdl());
  const decoded = ixCoder.decode(
    (ix as PartiallyDecodedInstruction).data ?? "",
    "base58"
  );

  return (
    ix.programId.equals(AUCTION_HOUSE_PROGRAM_ID) && decoded?.name === "sell"
  );
}

export default function parseSellTx(
  tx: ParsedTransactionWithMeta,
  signature: string,
  tokenMint?: PublicKey
): Maybe<NftTransaction> {
  const ixs = tx.transaction.message.instructions;
  const innerIxs = (getAllInnerIxsWithIndices(tx) || []).map((val) => val.ix);
  const listIx = [...ixs, ...innerIxs].find((ix) => isSellTx(ix));

  if (listIx == null) {
    return null;
  }

  const ixCoder = new BorshInstructionCoder(getIdl());
  const decoded = ixCoder.decode(
    (listIx as PartiallyDecodedInstruction).data,
    "base58"
  );

  const tokenMintForIx = (listIx as PartiallyDecodedInstruction).accounts[
    TOKEN_MINT_POSITION
  ];

  if (tokenMint != null && !tokenMint.equals(tokenMintForIx)) {
    return null;
  }

  const lister = (listIx as PartiallyDecodedInstruction).accounts[0];

  return {
    blockTime: tx.blockTime,
    fromAddress: lister.toString(),
    mint: tokenMintForIx.toString(),
    // @ts-ignore
    priceInLamports: decoded?.data.buyerPrice.toString(),
    toAddress: lister.toString(),
    txid: signature,
    type: NftTransactionType.Listed,
  };
}
