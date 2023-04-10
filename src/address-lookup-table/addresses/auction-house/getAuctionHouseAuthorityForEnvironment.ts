import {
  assertUnreachable,
  Environment,
} from "@formfunction-hq/formfunction-program-shared";
import { PublicKey } from "@solana/web3.js";

export default function getAuctionHouseAuthorityForEnvironment(
  environment: Environment
): PublicKey {
  switch (environment) {
    case Environment.Local:
      return new PublicKey("BR4hwUuuwk3WBnQ9ENEbNnGoiDiup7nWgVM24cAg8xMR");
    case Environment.Testnet:
      return new PublicKey("3YihDrzZz4XPbuZpjwmLeB8U46vBjci4agDYq3WHtn9Y");
    case Environment.Development:
      return new PublicKey("HSF7CpC5JwthGi6rDymX6hXUvVKDKDthKSb5gME15EWx");
    case Environment.Production:
      return new PublicKey("2nmN38wUByqTB4hMQ2PVVjbgaqrawNCVEWMCsr3wzhm5");
    default: {
      return assertUnreachable(environment);
    }
  }
}
