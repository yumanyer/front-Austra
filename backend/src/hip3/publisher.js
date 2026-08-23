import { formatPrice } from '@nktkas/hyperliquid/utils';
import { config } from '../config.js';
import { getPrice } from '../oracle/index.js';

const { enabled, dryRun, isTestnet, dex, coin, assetName, szDecimals, publishIntervalMs, oracleUpdaterKey } = config.hip3;

// The data clock (ORACLE_POLL_INTERVAL_MS, 30s — Data912 caches for 30s) and this
// publish clock are deliberately independent: HyperCore expects a setOracle every
// ~3s even when the price has not moved, and drops the mark to its local value
// after 10s of silence. So we republish the standing price rather than waiting for
// a new print.
let publishTimer = null;
let client = null;

let lastPublishAt = 0;
let lastPublishedPx = null;
let publishCount = 0;
let consecutiveFailures = 0;
let lastError = null;
let staleSkips = 0;
let skippingStale = false;
let inFlight = false;

/**
 * Builds the setOracle action for the current oracle state.
 *
 * `oraclePxs` carries the published (post-circuit-breaker) price, which HyperCore
 * uses for funding and liquidations. `markPxs` carries the untouched print. While
 * the breaker is frozen the two deliberately diverge: the oracle holds, the mark
 * still reflects what the venue actually printed.
 *
 * Every tuple list must be lexicographically sorted by coin before signing.
 *
 * @param {import('../types.js').OraclePriceResponse} oracle
 * @returns {{ dex: string, oraclePxs: [string, string][], markPxs: [string, string][][], externalPerpPxs: [string, string][] }}
 */
export function buildSetOracle(oracle) {
  const oraclePx = formatPrice(oracle.price, szDecimals, 'perp');
  const markSource = oracle.lastPrint ?? oracle.price;
  const markPx = formatPrice(markSource, szDecimals, 'perp');

  return {
    dex,
    // The tuple key is the fully-qualified dex:coin — a bare coin is rejected
    // with "Unknown coin".
    oraclePxs: sortByCoin([[assetName, oraclePx]]),
    markPxs: [sortByCoin([[assetName, markPx]])],
    // Required once the asset is listed: an empty list is accepted while it is
    // delisted, but afterwards HyperCore answers "externalPerpPxs missing perp".
    // No other venue lists a YPF perp, so the reference is our own untouched
    // print — the same value that bounds how far the mark may drift.
    externalPerpPxs: sortByCoin([[assetName, markPx]]),
  };
}

function sortByCoin(tuples) {
  return [...tuples].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

async function getClient() {
  if (client) return client;
  const hl = await import('@nktkas/hyperliquid');
  const { privateKeyToAccount } = await import('viem/accounts');
  const wallet = privateKeyToAccount(oracleUpdaterKey);
  client = new hl.ExchangeClient({ transport: new hl.HttpTransport({ isTestnet }), wallet });
  return client;
}

async function publish() {
  let oracle;
  try {
    oracle = getPrice();
  } catch {
    return; // oracle has not produced a price yet
  }

  // A stale print must never be republished as if it were fresh: HyperCore drops
  // the mark to its own local value after 10s of silence, which is the correct
  // failure mode when the feed is down. Re-signing the old price defeats that
  // protection and presents rancid data as current. A frozen price is different —
  // it is the breaker's deliberately-held value — so it keeps publishing.
  if (oracle.status === 'stale' || oracle.status === 'error') {
    staleSkips += 1;
    skippingStale = true;
    return;
  }
  skippingStale = false;

  let action;
  try {
    action = buildSetOracle(oracle);
  } catch (err) {
    // formatPrice rejects non-finite or truncated-to-zero prices.
    consecutiveFailures += 1;
    lastError = `format: ${err.message}`;
    console.error(`[hip3] Could not format price ${oracle.price}: ${err.message}`);
    return;
  }

  const px = action.oraclePxs[0][1];

  if (dryRun) {
    publishCount += 1;
    lastPublishAt = nowSeconds();
    consecutiveFailures = 0;
    lastError = null;
    // Only log on change: at a 3s cadence against a 30s data clock, most publishes
    // repeat the previous price and would otherwise flood the log.
    if (px !== lastPublishedPx) {
      console.log(`[hip3] DRY RUN setOracle ${JSON.stringify(action)}`);
    }
    lastPublishedPx = px;
    return;
  }

  try {
    const hlClient = await getClient();
    await hlClient.perpDeploy({ setOracle: action });
    publishCount += 1;
    lastPublishAt = nowSeconds();
    consecutiveFailures = 0;
    lastError = null;
    if (px !== lastPublishedPx) {
      console.log(`[hip3] setOracle ${dex}:${coin} → $${px}`);
    }
    lastPublishedPx = px;
  } catch (err) {
    consecutiveFailures += 1;
    lastError = err.message;
    // A failure must never break the interval — the next tick has to keep trying,
    // because 10s of silence drops the mark to HyperCore's local value.
    console.error(`[hip3] setOracle failed (${consecutiveFailures} in a row): ${err.message}`);
  }
}

/**
 * Runs `publish()` guarded against overlap: if a run is still in flight when the
 * next tick fires, the tick is skipped rather than starting a second signed
 * action concurrently (two in-flight actions can be signed with different nonces
 * and land on HyperCore out of order, publishing a stale price after a fresh one).
 */
async function tick() {
  if (inFlight) return;
  inFlight = true;
  try {
    await publish();
  } finally {
    inFlight = false;
  }
}

/** Starts the ~3s publish loop. */
export function startPublisher() {
  if (!enabled) {
    console.log('[hip3] Disabled — set HIP3_ENABLED=true to publish oracle prices');
    return;
  }

  const mode = dryRun
    ? 'DRY RUN (builds and logs the action, never signs or sends)'
    : `LIVE on ${isTestnet ? 'testnet' : 'MAINNET'}`;
  console.log(`[hip3] Publishing ${dex}:${coin} every ${publishIntervalMs}ms — ${mode}`);

  tick();
  publishTimer = setInterval(tick, publishIntervalMs);
}

/** Stops the publish loop so the process can exit cleanly. */
export function stopPublisher() {
  if (publishTimer) clearInterval(publishTimer);
  publishTimer = null;
}

/** Publisher state for /health and /market. */
export function publisherState() {
  return {
    enabled,
    dryRun,
    isTestnet,
    market: `${dex}:${coin}`,
    publishIntervalMs,
    publishing: enabled && publishCount > 0 && consecutiveFailures === 0 && !skippingStale,
    publishCount,
    lastPublishAt: lastPublishAt || null,
    lastPublishedPx,
    consecutiveFailures,
    lastError,
    staleSkips,
    skippingStale,
  };
}

/** Test hook. */
export function resetPublisher() {
  lastPublishAt = 0;
  lastPublishedPx = null;
  publishCount = 0;
  consecutiveFailures = 0;
  lastError = null;
  staleSkips = 0;
  skippingStale = false;
  inFlight = false;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}
