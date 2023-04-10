import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import fs from "fs";
import process from "process";

interface Wallet {
  publicKey: PublicKey;
  signAllTransactions(txs: Array<Transaction>): Promise<Array<Transaction>>;
  signTransaction(tx: Transaction): Promise<Transaction>;
}

/**
 * Node only wallet.
 */
export default class NodeWallet implements Wallet {
  constructor(readonly payer: Keypair) {}

  static local(): NodeWallet {
    const ANCHOR_WALLET = process.env.ANCHOR_WALLET;
    if (ANCHOR_WALLET == null) {
      throw new Error("process.env.ANCHOR_WALLET not defined");
    }
    const payer = Keypair.fromSecretKey(
      Buffer.from(
        JSON.parse(
          fs.readFileSync(ANCHOR_WALLET, {
            encoding: "utf-8",
          })
        )
      )
    );
    return new NodeWallet(payer);
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions(
    txs: Array<Transaction>
  ): Promise<Array<Transaction>> {
    return txs.map((t) => {
      t.partialSign(this.payer);
      return t;
    });
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}
