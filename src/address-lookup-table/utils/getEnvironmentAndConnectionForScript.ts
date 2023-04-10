import { Environment } from "@formfunction-hq/formfunction-program-shared";
import { Connection } from "@solana/web3.js";
import getRpcFromEnvironment from "address-lookup-table/utils/getRpcFromEnvironment";
import parseScriptArgs from "address-lookup-table/utils/parseScriptArgs";

export default function getEnvironmentAndConnectionForScript(): {
  connection: Connection;
  environment: Environment;
} {
  const { environment } = parseScriptArgs();
  const connection = new Connection(
    getRpcFromEnvironment(environment),
    "processed"
  );
  return { connection, environment };
}
