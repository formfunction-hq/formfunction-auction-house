import {
  assertUnreachable,
  Environment,
} from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";
import Currency from "address-lookup-table/types/Currency";

// Lifted from formfn-monorepo.
export default function getAuctionHouseAccountKeyForCurrency(
  environment: Environment,
  currency: Currency
): PublicKey {
  switch (environment) {
    case Environment.Production:
      switch (currency) {
        case Currency.Bonk:
          return new PublicKey("CfyQQDi7hhAgnQVgXyMTTTBV2nEt8TbPkgLMbM6G5GEV");
        case Currency.Solana:
          return new PublicKey("u5pLTMPar2nvwyPPVKbJ3thqfv7hPADdn3eR8zo1Q2M");
        case Currency.UsdCoin:
          return new PublicKey("3TPU8SuKEghJgE1EBcbZgVfQKAFoAPkc1NfHDZYJyF77");
        case Currency.FamousFoxFederation:
          return new PublicKey("4QZDroaPxHMJmR3ByWHz1QeLAkSRC68gQ2u4G3wrtd2T");
        case Currency.Particles:
          return new PublicKey("HtsczT1hN9SdPPiLCt8k8dRUhPLhqc3tcSMu4n6uYFw2");
        case Currency.SkeletonCrew:
          return new PublicKey("GVoQ2aXF4beQwc2AmPJyiSKcaHbyphn1GsPD43yyxPtx");
        default:
          return assertUnreachable(currency);
      }
    // This is the auction house address which is typically created in the SDK
    // test setup when running local SDK tests.
    case Environment.Local:
      return new PublicKey("8nEg1EYQ24mvy8fkKbS7kje6rsfBKY1cZ8CyWBoL57QA");
    // NOTE: for all other environments, we just use the same auction house
    // for SPL tokens as they have no practical difference.
    case Environment.Development:
      switch (currency) {
        case Currency.Solana:
          return new PublicKey("DJ117NHZaXzpKQ5VwHzQBGzJYKwRT6vaxWd2q39gkXxN");
        case Currency.Bonk:
        case Currency.UsdCoin:
        case Currency.FamousFoxFederation:
        case Currency.Particles:
        case Currency.SkeletonCrew:
          return new PublicKey("CXfjR5HG27MWd33xM753QmEFbNbbqUphqNPSL32ayJcs");
        default:
          return assertUnreachable(currency);
      }
    case Environment.Testnet:
      switch (currency) {
        case Currency.Solana:
          return new PublicKey("BnYmzPQitxZ3Q736LrC25bcvBN8hPLth1q3z4JJxyY7s");
        case Currency.Bonk:
        case Currency.UsdCoin:
        case Currency.FamousFoxFederation:
        case Currency.Particles:
        case Currency.SkeletonCrew:
          return new PublicKey("CDNhFyynrvPSDgKqttX6QoSLTAPeEbgZMG7FJSGWkaLk");
        default:
          return assertUnreachable(currency);
      }
    default:
      return assertUnreachable(environment);
  }
}
