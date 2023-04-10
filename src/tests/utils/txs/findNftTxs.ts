import {
  filterNulls,
  Maybe,
} from "@formfunction-hq/formfunction-program-shared";
import { ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";
import parseBuyTx from "tests/utils/txs/parse/parseBuyTx";
import parseCancelTx from "tests/utils/txs/parse/parseCancelTx";
import parseCreateMintTx from "tests/utils/txs/parse/parseCreateMintTx";
import parseExecuteSaleTx from "tests/utils/txs/parse/parseExecuteSale";
import parseSellTx from "tests/utils/txs/parse/parseSellTx";
import parseTxWithTransfer from "tests/utils/txs/parse/parseTxWithTransfer";

export default function findNftTxs(
  txs: Array<Maybe<ParsedTransactionWithMeta>>,
  signatures: Array<string>,
  tokenMint: PublicKey
) {
  return filterNulls(
    txs.map((tx, index) => {
      if (tx == null) {
        return null;
      }

      const createMint = parseCreateMintTx(tx, signatures[index]);
      if (createMint != null) {
        return createMint;
      }

      const sell = parseSellTx(tx, signatures[index], tokenMint);
      if (sell != null) {
        return sell;
      }

      const cancel = parseCancelTx(tx, signatures[index], tokenMint);
      if (cancel != null) {
        return cancel;
      }

      const buy = parseBuyTx(tx, signatures[index], tokenMint);
      if (buy != null) {
        return buy;
      }

      const executeSale = parseExecuteSaleTx(tx, signatures[index], tokenMint);
      if (executeSale != null) {
        return executeSale;
      }

      return parseTxWithTransfer(tx, signatures[index], tokenMint);
    })
  );
}
