import {
  filterNulls,
  Maybe,
} from "@formfunction-hq/formfunction-program-shared";
import { ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";
import parseTxWithTransfer from "tests/utils/txs/parse/parseTxWithTransfer";

export default function findTxsWithTransfer(
  txs: Array<Maybe<ParsedTransactionWithMeta>>,
  signatures: Array<string>,
  tokenMint: PublicKey
) {
  return filterNulls(
    txs.map((tx, index) => {
      if (tx == null) {
        return null;
      }
      return parseTxWithTransfer(tx, signatures[index], tokenMint);
    })
  );
}
