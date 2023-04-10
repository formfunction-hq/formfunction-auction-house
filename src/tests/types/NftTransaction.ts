import { MaybeUndef } from "@formfunction-hq/formfunction-program-shared";
import NftTransactionType from "tests/types/enums/NftTransactionType";

type NftTransaction = {
  blockTime: MaybeUndef<number>;
  fromAddress: string;
  mint: string;
  priceInLamports?: string;
  toAddress: string;
  txid: string;
  type: NftTransactionType;
};

export default NftTransaction;
