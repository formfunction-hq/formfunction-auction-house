import { readFileSync } from "fs";

export default function getIdl() {
  return JSON.parse(readFileSync("./target/idl/auction_house.json", "utf8"));
}
