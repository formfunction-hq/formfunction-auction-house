import * as anchor from "@project-serum/anchor";
import { Cluster, Keypair, PublicKey } from "@solana/web3.js";
import loadAuctionHouseProgramWithWallet from "solana/programs/loadAuctionHouseProgramWithWallet";
import AuctionHouseProgram from "types/AuctionHouseProgram";

export default function loadAuctionHouseProgram(
  auctionHouseProgramId: PublicKey | string,
  walletKeyPair: Keypair,
  env: Cluster,
  customRpcUrl?: string
): AuctionHouseProgram {
  const walletWrapper = new anchor.Wallet(walletKeyPair);
  return loadAuctionHouseProgramWithWallet(
    auctionHouseProgramId,
    walletWrapper,
    env,
    customRpcUrl
  );
}
