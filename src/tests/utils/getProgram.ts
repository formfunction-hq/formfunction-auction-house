import * as anchor from "@project-serum/anchor";
import { AnchorProvider } from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { AUCTION_HOUSE_PROGRAM_ID } from "tests/constants/AuctionHouse";
import getIdl from "tests/utils/getIdl";
import AuctionHouseProgram from "types/AuctionHouseProgram";

function getProvider(walletKeyPair: Keypair) {
  const url = process.env.ANCHOR_PROVIDER_URL;
  if (url === undefined) {
    throw new Error("ANCHOR_PROVIDER_URL is not defined");
  }
  const options = AnchorProvider.defaultOptions();
  const connection = new Connection(url, options.commitment);
  const walletWrapper = new anchor.Wallet(walletKeyPair);
  return new AnchorProvider(connection, walletWrapper, options);
}

export default function getProgram(walletKeyPair: Keypair) {
  const program = new anchor.Program(
    getIdl(),
    AUCTION_HOUSE_PROGRAM_ID,
    getProvider(walletKeyPair)
  ) as AuctionHouseProgram;

  return program;
}
