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

const TOKEN_MINT_POSITION = 3;

function isExecuteSaleIx(
  ix: ParsedInstruction | PartiallyDecodedInstruction
): boolean {
  const ixCoder = new BorshInstructionCoder(getIdl());
  const decoded = ixCoder.decode(
    (ix as PartiallyDecodedInstruction).data ?? "",
    "base58"
  );

  return (
    ix.programId.equals(AUCTION_HOUSE_PROGRAM_ID) &&
    decoded?.name === "executeSale"
  );
}

export default function parseExecuteSaleTx(
  tx: ParsedTransactionWithMeta,
  signature: string,
  tokenMint?: PublicKey
): Maybe<NftTransaction> {
  const ixs = tx.transaction.message.instructions;
  const executeSaleIx = ixs.find((ix) => isExecuteSaleIx(ix));

  if (executeSaleIx == null) {
    return null;
  }

  const ixCoder = new BorshInstructionCoder(getIdl());
  const decoded = ixCoder.decode(
    (executeSaleIx as PartiallyDecodedInstruction).data,
    "base58"
  );

  const tokenMintForIx = (executeSaleIx as PartiallyDecodedInstruction)
    .accounts[TOKEN_MINT_POSITION];

  if (tokenMint != null && !tokenMint.equals(tokenMintForIx)) {
    return null;
  }

  const buyer = (executeSaleIx as PartiallyDecodedInstruction).accounts[0];
  const seller = (executeSaleIx as PartiallyDecodedInstruction).accounts[1];

  return {
    blockTime: tx.blockTime,
    fromAddress: seller.toString(),
    mint: tokenMintForIx.toString(),
    // @ts-ignore
    priceInLamports: decoded?.data.buyerPrice.toString(),
    toAddress: buyer.toString(),
    txid: signature,
    type: NftTransactionType.Sold,
  };
}
