import {
  convertNumberForIxArg,
  findEditionPda,
  Maybe,
  MaybeUndef,
} from "@formfunction-hq/formfunction-program-shared";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import convertPriceFunctionTypeToAnchorArg from "solana/auction-house/convertPriceFunctionTypeToAnchorArg";
import findEditionDistributor from "solana/pdas/findEditionDistributor";
import AuctionHouseProgram from "types/AuctionHouseProgram";
import PriceFunctionType from "types/enum/PriceFunctionType";

type Accounts = {
  mint: PublicKey;
  owner: PublicKey;
  program: AuctionHouseProgram;
  treasuryMint: PublicKey;
};

type Args = {
  allowlistSalePrice: Maybe<number>;
  allowlistSaleStartTime: Maybe<number>;
  newOwner?: MaybeUndef<PublicKey>;
  priceFunctionType?: MaybeUndef<PriceFunctionType>;
  priceParams?: MaybeUndef<Array<number>>;
  publicSaleStartTime: Maybe<number>;
  saleEndTime: Maybe<number>;
  startingPriceLamports?: MaybeUndef<number>;
};

export default async function auctionHouseUpdateEditionDistributorIx(
  { owner, mint, program, treasuryMint }: Accounts,
  {
    allowlistSalePrice,
    allowlistSaleStartTime,
    newOwner,
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
    .updateEditionDistributor(
      masterEditionBump,
      convertNumberForIxArg(startingPriceLamports),
      priceFunctionType == null
        ? null
        : convertPriceFunctionTypeToAnchorArg(priceFunctionType),
      priceParams ?? null,
      newOwner ?? null,
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
      treasuryMint,
    })
    .instruction();
}
