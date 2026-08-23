const DEFAULT_CONFIG = {
  API_URL: "http://localhost:3000",
  USE_DEMO_DATA: false,
  REQUEST_TIMEOUT_MS: 5000,
  RPC_URL: "https://rpc.hyperliquid-testnet.xyz/evm",
  RPC_TIMEOUT_MS: 5000,
};

function readGlobalConfig() {
  return typeof globalThis !== "undefined" && globalThis.AUSTRAL_CONFIG && typeof globalThis.AUSTRAL_CONFIG === "object"
    ? globalThis.AUSTRAL_CONFIG
    : {};
}

export function getConfig() {
  const configured = readGlobalConfig();
  const timeout = Number(configured.REQUEST_TIMEOUT_MS ?? configured.requestTimeoutMs ?? DEFAULT_CONFIG.REQUEST_TIMEOUT_MS);
  const rpcTimeout = Number(configured.RPC_TIMEOUT_MS ?? configured.rpcTimeoutMs ?? DEFAULT_CONFIG.RPC_TIMEOUT_MS);
  return {
    API_URL: String(configured.API_URL ?? configured.apiUrl ?? DEFAULT_CONFIG.API_URL).replace(/\/$/, ""),
    USE_DEMO_DATA: configured.USE_DEMO_DATA ?? configured.useDemoData ?? DEFAULT_CONFIG.USE_DEMO_DATA,
    REQUEST_TIMEOUT_MS: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_CONFIG.REQUEST_TIMEOUT_MS,
    RPC_URL: String(configured.RPC_URL ?? configured.rpcUrl ?? DEFAULT_CONFIG.RPC_URL).replace(/\/$/, ""),
    RPC_TIMEOUT_MS: Number.isFinite(rpcTimeout) && rpcTimeout > 0 ? rpcTimeout : DEFAULT_CONFIG.RPC_TIMEOUT_MS,
  };
}

export function isDemoMode() {
  return getConfig().USE_DEMO_DATA === true;
}
