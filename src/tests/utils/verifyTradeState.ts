import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import AuctionHouseSdk from "solana/auction-house/AuctionHouseSdk";
import SaleType from "types/enum/SaleType";

// See programs/formfn-auction-house/lib.rs
const DEFAULT_TRADE_STATE_SIZE = 130;

export default async function verifyTradeState(
  sdk: AuctionHouseSdk,
  connection: Connection,
  {
    wallet,
    tokenAccount,
    tokenMint,
    expectNull,
    priceInSol,
    saleType,
    size,
  }: {
    expectNull: boolean;
    priceInSol: number;
    saleType?: SaleType;
    size?: number;
    tokenAccount: PublicKey;
    tokenMint: PublicKey;
    wallet: PublicKey;
  }
) {
  const [tradeState, tradeStateBump] = await sdk.findTradeState(
    wallet,
    tokenAccount,
    tokenMint,
    priceInSol * LAMPORTS_PER_SOL
  );

  const tradeStateAccount = await connection.getAccountInfo(tradeState);
  if (expectNull) {
    expect(tradeStateAccount).toBe(null);
  } else {
    expect(tradeStateAccount!.data[0]).toEqual(tradeStateBump);
    if (size != null) {
      expect(tradeStateAccount!.data.byteLength).toEqual(
        size ?? DEFAULT_TRADE_STATE_SIZE
      );
      if (size > 1) {
        expect(tradeStateAccount!.data[1]).toEqual(saleType ?? 0);
      }
    }
  }
}
