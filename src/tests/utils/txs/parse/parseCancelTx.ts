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

const TOKEN_MINT_POSITION = 2;

function isCancelIx(
  ix: ParsedInstruction | PartiallyDecodedInstruction
): boolean {
  const ixCoder = new BorshInstructionCoder(getIdl());
  const decoded = ixCoder.decode(
    (ix as PartiallyDecodedInstruction).data ?? "",
    "base58"
  );

  return (
    ix.programId.equals(AUCTION_HOUSE_PROGRAM_ID) &&
    (decoded?.name === "cancel" || decoded?.name === "cancelV2")
  );
}

export default function parseCancelTx(
  tx: ParsedTransactionWithMeta,
  signature: string,
  tokenMint?: PublicKey
): Maybe<NftTransaction> {
  const ixs = tx.transaction.message.instructions;
  const cancelIx = ixs.find((ix) => isCancelIx(ix));

  if (cancelIx == null) {
    return null;
  }

  const tokenMintForIx = (cancelIx as PartiallyDecodedInstruction).accounts[
    TOKEN_MINT_POSITION
  ];

  if (tokenMint != null && !tokenMint.equals(tokenMintForIx)) {
    return null;
  }

  const lister = (cancelIx as PartiallyDecodedInstruction).accounts[0];

  return {
    blockTime: tx.blockTime,
    fromAddress: lister.toString(),
    mint: tokenMintForIx.toString(),
    toAddress: lister.toString(),
    txid: signature,
    type: NftTransactionType.ListingCancelled,
  };
}
