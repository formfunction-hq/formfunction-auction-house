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
const TOKEN_MINT_POSITION = 11;

function isBuyIx(ix: ParsedInstruction | PartiallyDecodedInstruction): boolean {
  const ixCoder = new BorshInstructionCoder(getIdl());
  const decoded = ixCoder.decode(
    (ix as PartiallyDecodedInstruction).data ?? "",
    "base58"
  );

  return (
    ix.programId.equals(AUCTION_HOUSE_PROGRAM_ID) &&
    (decoded?.name === "buy" || decoded?.name === "buyV2")
  );
}

export default function parseBuyTx(
  tx: ParsedTransactionWithMeta,
  signature: string,
  tokenMint?: PublicKey
): Maybe<NftTransaction> {
  const ixs = tx.transaction.message.instructions;
  const innerIxs = (getAllInnerIxsWithIndices(tx) || []).map((val) => val.ix);
  const bidIx = [...ixs, ...innerIxs].find((ix) => isBuyIx(ix));

  if (bidIx == null) {
    return null;
  }

  const ixCoder = new BorshInstructionCoder(getIdl());
  const decoded = ixCoder.decode(
    (bidIx as PartiallyDecodedInstruction).data,
    "base58"
  );

  const tokenMintForIx = (bidIx as PartiallyDecodedInstruction).accounts[
    TOKEN_MINT_POSITION
  ];

  if (tokenMint != null && !tokenMint.equals(tokenMintForIx)) {
    return null;
  }

  const bidder = (bidIx as PartiallyDecodedInstruction).accounts[0];

  return {
    blockTime: tx.blockTime,
    fromAddress: bidder.toString(),
    mint: tokenMintForIx.toString(),
    // @ts-ignore
    priceInLamports: decoded?.data.buyerPrice.toString(),
    toAddress: bidder.toString(),
    txid: signature,
    type: NftTransactionType.Bid,
  };
}
