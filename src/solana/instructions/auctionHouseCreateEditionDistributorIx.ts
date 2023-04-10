import {
  convertNumberForIxArg,
  findEditionPda,
  Maybe,
} from "@formfunction-hq/formfunction-program-shared";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import convertPriceFunctionTypeToAnchorArg from "solana/auction-house/convertPriceFunctionTypeToAnchorArg";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import AuctionHouseProgram from "types/AuctionHouseProgram";
import PriceFunctionType from "types/enum/PriceFunctionType";

type Accounts = {
  mint: PublicKey;
  owner: PublicKey;
  program: AuctionHouseProgram;
  tokenAccount: PublicKey;
  treasuryMint: PublicKey;
};

type Args = {
  allowlistSalePrice: Maybe<number>;
  allowlistSaleStartTime: Maybe<number>;
  priceFunctionType: PriceFunctionType;
  priceParams: Array<number>;
  publicSaleStartTime: Maybe<number>;
  saleEndTime: Maybe<number>;
  startingPriceLamports: number;
};

export default async function auctionHouseCreateEditionDistributorIx(
  { mint, owner, program, tokenAccount, treasuryMint }: Accounts,
  {
    allowlistSalePrice,
    allowlistSaleStartTime,
    priceFunctionType,
    priceParams,
    publicSaleStartTime,
    saleEndTime,
    startingPriceLamports,
  }: Args
): Promise<TransactionInstruction> {
  const [editionDistributor] = findEditionDistributor(mint, program.programId);
  const [masterEdition, masterEditionBump] = findEditionPda(mint);

  return program.methods
    .createEditionDistributor(
      masterEditionBump,
      new BN(startingPriceLamports),
      convertPriceFunctionTypeToAnchorArg(priceFunctionType),
      priceParams,
      convertNumberForIxArg(allowlistSaleStartTime),
      convertNumberForIxArg(publicSaleStartTime),
      convertNumberForIxArg(saleEndTime),
      convertNumberForIxArg(allowlistSalePrice)
    )
    .accounts({
      editionDistributor,
      masterEdition,
      mint,
      owner,
      systemProgram: SystemProgram.programId,
      tokenAccount,
      treasuryMint,
    })
    .instruction();
}
