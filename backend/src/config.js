/**
 * Single source of truth for backend configuration.
 *
 * Values come from the environment; `.env` files are loaded by the npm scripts via
 * `--env-file-if-exists` (root first, then backend/, so the local file wins — and
 * real shell/CI variables win over both).
 *
 * Invalid values do not throw at import time: they fall back to the default and are
 * collected in `configErrors`, which src/index.js reports before refusing to boot.
 * That keeps the modules importable from tests while still failing fast in the app.
 */

/** @type {string[]} */
export const configErrors = [];

function raw(name) {
  const v = process.env[name];
  return v === undefined || v === '' ? null : v;
}

function int(name, fallback, { min = -Infinity, max = Infinity } = {}) {
  const v = raw(name);
  if (v === null) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isInteger(n) || n < min || n > max) {
    configErrors.push(`${name}="${v}" is not an integer in [${min}, ${max}] (using ${fallback})`);
    return fallback;
  }
  return n;
}

function num(name, fallback, { min = -Infinity, max = Infinity, exclusiveMin = false } = {}) {
  const v = raw(name);
  if (v === null) return fallback;
  const n = Number.parseFloat(v);
  const tooLow = exclusiveMin ? n <= min : n < min;
  if (!Number.isFinite(n) || tooLow || n > max) {
    const lo = exclusiveMin ? `(${min}` : `[${min}`;
    configErrors.push(`${name}="${v}" is not a number in ${lo}, ${max}] (using ${fallback})`);
    return fallback;
  }
  return n;
}

function bool(name, fallback) {
  const v = raw(name);
  if (v === null) return fallback;
  if (v === 'true') return true;
  if (v === 'false') return false;
  configErrors.push(`${name}="${v}" must be "true" or "false" (using ${fallback})`);
  return fallback;
}

function str(name, fallback) {
  return raw(name) ?? fallback;
}

function url(name, fallback) {
  const v = raw(name);
  if (v === null) return fallback;
  try {
    new URL(v);
    return v.replace(/\/+$/, ''); // paths are concatenated, so no trailing slash
  } catch {
    configErrors.push(`${name}="${v}" is not a valid URL (using ${fallback})`);
    return fallback;
  }
}

/** Optional hex value — absent is fine, malformed is not. */
function hex(name, bytes) {
  const v = raw(name);
  if (v === null) return null;
  if (!new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`).test(v)) {
    configErrors.push(`${name} is not a 0x-prefixed ${bytes}-byte hex string (ignored)`);
    return null;
  }
  return v;
}

/** Optional string constrained by a regex. */
function pattern(name, re, label, fallback) {
  const v = raw(name);
  if (v === null) return fallback;
  if (!re.test(v)) {
    configErrors.push(`${name}="${v}" ${label} (using ${fallback})`);
    return fallback;
  }
  return v;
}

const contractAddress = hex('ORACLE_CONTRACT_ADDRESS', 20);
const privateKey = hex('PUSHER_PRIVATE_KEY', 32);

// HIP-3 oracle publishing. The dex name is constrained to 2-4 lowercase letters by
// HyperCore, and the market identity is the (dex, coin) pair — "YPF-PERP" is only a
// display name. Dry run defaults to true so nothing is ever signed by accident.
const hip3 = {
  enabled: bool('HIP3_ENABLED', false),
  dryRun: bool('HIP3_DRY_RUN', true),
  isTestnet: bool('HIP3_TESTNET', true),
  dex: pattern('HIP3_DEX', /^[a-z]{2,4}$/, 'must be 2-4 lowercase letters', 'arg'),
  coin: str('HIP3_COIN', 'YPF').toUpperCase(),
  // Mirrors felix:TSLA on testnet — a US equity perp with szDecimals 2 on margin
  // table 5 (5x). The margin table, not a free parameter, is what caps leverage.
  szDecimals: int('HIP3_SZ_DECIMALS', 2, { min: 0, max: 6 }),
  fullName: str('HIP3_FULL_NAME', 'austral.fi Argentine Markets'),
  collateralToken: int('HIP3_COLLATERAL_TOKEN', 0, { min: 0 }),   // USDC spot index
  marginTableId: int('HIP3_MARGIN_TABLE_ID', 5, { min: 0 }),
  marginMode: pattern('HIP3_MARGIN_MODE', /^(strictIsolated|noCross|normal)$/,
    'must be strictIsolated, noCross or normal', 'strictIsolated'),
  // Inferred from testnet, not documented: 240 of the 244 live-dex deployers hold
  // >= 100 HYPE, clustered at exactly 100.0000. Tunable once the API confirms it.
  minStakeHype: num('HIP3_MIN_STAKE_HYPE', 100, { min: 0 }),
  // Deploy auction gas, in native token wei. Empty means "pay the current auction
  // price", which is 500 HYPE right now — more than a hackathon wallet holds. 0
  // requests a reserve deployment instead, which is the documented path for
  // deploying without winning the auction.
  maxGas: raw('HIP3_MAX_GAS') === null ? null : int('HIP3_MAX_GAS', 0, { min: 0 }),
  // HyperCore requires >= 2.5s between setOracle calls and expects one every ~3s,
  // even when the price has not changed; marks go stale after 10s of silence.
  publishIntervalMs: int('HIP3_PUBLISH_INTERVAL_MS', 3000, { min: 2500 }),
  oracleUpdaterKey: hex('HIP3_ORACLE_UPDATER_KEY', 32),
};

// HyperCore identifies a builder-deployed asset by its fully-qualified `dex:coin`
// name, and it wants that form in BOTH registerAsset2's `coin` field and every
// setOracle tuple. Verified the hard way: a bare "YPF" gets `Invalid perp DEX` on
// registration and `Unknown coin YPF` on setOracle.
hip3.assetName = `${hip3.dex}:${hip3.coin}`;

if (hip3.enabled && !hip3.dryRun && !hip3.oracleUpdaterKey) {
  configErrors.push('HIP3_ENABLED=true with HIP3_DRY_RUN=false requires HIP3_ORACLE_UPDATER_KEY');
}

// Comma-separated allow-list; "*" opts back into any-origin for local hacking.
const corsOriginsRaw = str('CORS_ORIGINS', 'http://localhost:5173');
const corsOrigins = corsOriginsRaw === '*'
  ? true
  : corsOriginsRaw.split(',').map((s) => s.trim()).filter(Boolean);

export const config = deepFreeze({
  port: int('PORT', 3000, { min: 1, max: 65535 }),
  host: str('HOST', '127.0.0.1'),
  corsOrigins,

  data912: {
    baseUrl: url('DATA912_BASE_URL', 'https://data912.com'),
    timeoutMs: int('DATA912_TIMEOUT_MS', 5000, { min: 500 }),
  },

  oracle: {
    // The ADR ticker, as listed on the US feed. The local BYMA ticker is a
    // separate symbol (YPF trades locally as YPFD), so both are configured.
    symbol: str('ORACLE_SYMBOL', 'YPF').toUpperCase(),
    localSymbol: str('ORACLE_LOCAL_SYMBOL', 'YPFD').toUpperCase(),
    // Upstream snapshots are Cloudflare-cached ~30s, so polling faster just burns quota.
    pollIntervalMs: int('ORACLE_POLL_INTERVAL_MS', 30000, { min: 1000 }),
    emaAlpha: num('ORACLE_EMA_ALPHA', 0.2, { min: 0, max: 1, exclusiveMin: true }),
    breakerPct: num('ORACLE_CIRCUIT_BREAKER_PCT', 0.1, { min: 0, max: 1, exclusiveMin: true }),
    breakerReleaseTicks: int('ORACLE_BREAKER_RELEASE_TICKS', 3, { min: 1 }),
    adrRatio: num('ORACLE_ADR_RATIO', 10, { min: 0, exclusiveMin: true }),
    spreadMaxPct: num('ORACLE_SPREAD_MAX_PCT', 0.02, { min: 0, exclusiveMin: true }),
    cclMaxDeviationPct: num('ORACLE_CCL_MAX_DEVIATION_PCT', 0.03, { min: 0, exclusiveMin: true }),
    // The CCL cross-check uses a market-wide reference rate rather than the traded
    // ticker's own: YPF is absent from Data912's CCL feed, and a median over the
    // most liquid pairs is both more robust and works for any asset.
    cclReferenceCount: int('ORACLE_CCL_REFERENCE_COUNT', 10, { min: 1 }),
    staleThresholdS: int('ORACLE_STALE_THRESHOLD_S', 60, { min: 1 }),
    seedCloses: int('ORACLE_SEED_CLOSES', 5, { min: 1 }),
    simulatedWalk: bool('ORACLE_SIMULATED_WALK', false),
  },

  hip3,

  pusher: {
    contractAddress,
    privateKey,
    enabled: Boolean(contractAddress && privateKey),
    intervalMs: int('PUSH_INTERVAL_MS', 30000, { min: 1000 }),
    rpcUrl: url('HYPERLIQUID_TESTNET_RPC', 'https://rpc.hyperliquid-testnet.xyz/evm'),
    chainId: int('HYPERLIQUID_CHAIN_ID', 998, { min: 1 }),
  },
});

/** Loggable view of the resolved config — never exposes the private key. */
export function describeConfig() {
  const { pusher, hip3: h, ...rest } = config;
  return {
    ...rest,
    hip3: { ...h, oracleUpdaterKey: h.oracleUpdaterKey ? '<set>' : null },
    pusher: { ...pusher, privateKey: pusher.privateKey ? '<set>' : null },
  };
}

function deepFreeze(obj) {
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') deepFreeze(value);
  }
  return Object.freeze(obj);
}
