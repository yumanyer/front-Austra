export function parseRpcHex(value) {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) return undefined;
  const number = Number.parseInt(value, 16);
  return Number.isSafeInteger(number) ? number : undefined;
}

export function shortenHex(value) {
  return typeof value === "string" && value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value || "—";
}

export function hasContractCode(code) {
  return typeof code === "string" && code.length > 2 && code !== "0x";
}

export function sameAddress(left, right) {
  return typeof left === "string" && typeof right === "string" && left.toLowerCase() === right.toLowerCase();
}

export function resolveContractStatus({ code, receipt, rpcConnected, expectedAddress }) {
  if (code === "0x") return "NOT DEPLOYED";
  if (hasContractCode(code)) return "DEPLOYED";
  if (receipt?.contractAddress && sameAddress(receipt.contractAddress, expectedAddress)) return "DEPLOYED";
  if (receipt?.status === "0x1" && !receipt.contractAddress) return "DEPLOYED";
  return rpcConnected ? "UNAVAILABLE" : "UNAVAILABLE";
}

export function resolveReceiptStatus(receipt, rpcConnected) {
  if (receipt?.status === "0x1") return "SUCCESS";
  if (receipt?.status === "0x0") return "ERROR";
  return rpcConnected ? "UNAVAILABLE" : "UNAVAILABLE";
}

export function resolveRpcStatus({ chainId, latestBlock, expectedChainId }) {
  if (!Number.isSafeInteger(chainId) || !Number.isSafeInteger(latestBlock)) return "UNAVAILABLE";
  return chainId === expectedChainId ? "CONNECTED" : "ERROR";
}
