export default function errorCodeToHexString(errorCode: number): string {
  return Number(errorCode).toString(16);
}
