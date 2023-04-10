import { requestAirdrops } from "@formfunction-hq/formfunction-program-shared";
import { Keypair } from "@solana/web3.js";
import getConnectionForTest from "tests/utils/getConnectionForTest";
import createProgrammableNft from "tests/utils/programmable-nfts/createProgrammableNft";

describe("Programmable NFTs test", () => {
  test("Create a Programmable NFT", async () => {
    const connection = getConnectionForTest();
    const creator = Keypair.generate();
    await requestAirdrops({ connection, wallets: [creator] });
    await createProgrammableNft({
      connection,
      creator,
      metadataCreators: [
        { address: creator.publicKey, share: 100, verified: true },
      ],
    });
  });
});
