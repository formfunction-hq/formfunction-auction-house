import { AnchorWallet } from "@formfunction-hq/formfunction-program-shared";
import * as anchor from "@project-serum/anchor";
import { web3 } from "@project-serum/anchor";
import { Cluster, PublicKey } from "@solana/web3.js";
import { AuctionHouse } from "idl/AuctionHouse";
import { AUCTION_HOUSE_IDL } from "index";
import AuctionHouseProgram from "types/AuctionHouseProgram";

export default function loadAuctionHouseProgramWithWallet(
  auctionHouseProgramId: PublicKey | string,
  wallet: AnchorWallet,
  env: Cluster,
  customRpcUrl?: string
): AuctionHouseProgram {
  const solConnection = new anchor.web3.Connection(
    customRpcUrl || web3.clusterApiUrl(env)
  );
  const provider = new anchor.AnchorProvider(solConnection, wallet, {
    preflightCommitment: "recent",
  });

  return new anchor.Program<AuctionHouse>(
    AUCTION_HOUSE_IDL as any,
    auctionHouseProgramId,
    provider
  );
}
