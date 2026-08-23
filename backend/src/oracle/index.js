import { fetchAll, fetchHistoricalCloses } from './fetcher.js';
import { normalize } from './normalizer.js';
import { updateEma, currentEma, seedEma } from './ema.js';
import { evaluate, isFrozen } from './circuitBreaker.js';
import { config } from '../config.js';
import { round6 } from '../util/num.js';

const {
  pollIntervalMs: POLL_MS,
  staleThresholdS: STALE_THRESHOLD_S,
  seedCloses: SEED_CLOSES,
  simulatedWalk: SIMULATED_WALK,
} = config.oracle;

/** @type {import('../types.js').OraclePriceResponse | null} */
let latestPrice = null;
let lastPrint = null;      // last untouched print observed from the feed
let lastFetchOkAt = 0;
let consecutiveFailures = 0;
let walkPrice = null;      // running value of the simulated walk
let pollTimer = null;
let pollInFlight = false;

/**
 * NYSE regular session, 9:30–16:00 America/New_York.
 * Uses the IANA zone so DST is handled by the runtime rather than a hand-rolled
 * month offset. Market holidays are NOT handled — out of scope for the MVP.
 * @param {Date} [date]
 */
export function isMarketOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = get('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') return false;

  const hour = parseInt(get('hour'), 10) % 24; // some ICU builds report midnight as 24
  const minutes = hour * 60 + parseInt(get('minute'), 10);
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

/**
 * Mean-reverting random walk around the last real close, for demoing while the
 * underlying market is closed. Always surfaced as source 'simulated' so the
 * value is never mistaken for a real print.
 * @param {number} anchor
 */
function simulatedWalk(anchor) {
  if (!Number.isFinite(walkPrice)) walkPrice = anchor;
  const drift = (Math.random() - 0.5) * 0.002; // ±0.1% per tick
  const pull = (anchor - walkPrice) * 0.15;    // stays tethered to the real close
  walkPrice = round6(walkPrice * (1 + drift) + pull);
  return walkPrice;
}

/**
 * Builds the published response when the feed gave us nothing usable.
 * @param {string} symbol
 */
function buildFallback(symbol) {
  const ema = currentEma();
  const base = ema ?? lastPrint ?? null;
  if (base === null) return null; // no baseline at all — routes answer 503

  const age = lastFetchOkAt ? nowSeconds() - lastFetchOkAt : Infinity;
  // Reflect the breaker's *current* state rather than the last cached verdict:
  // the EMA does not move while frozen, so a fetch failure here is reporting the
  // same value the breaker is holding, not a new one it invented.
  const status = age > STALE_THRESHOLD_S ? 'stale' : (isFrozen() ? 'frozen' : 'valid');

  return {
    ...(latestPrice ?? emptyPrice(symbol)),
    price: SIMULATED_WALK ? simulatedWalk(base) : base,
    ema,
    lastPrint,
    timestamp: nowSeconds(),
    lastPrintAt: lastFetchOkAt || null,
    status,
    source: SIMULATED_WALK ? 'simulated' : 'ema_fallback',
    simulated: SIMULATED_WALK,
    marketOpen: isMarketOpen(),
  };
}

/**
 * One iteration of the oracle pipeline: fetch → normalize → circuit breaker → EMA.
 *
 * The EMA is read *before* evaluating and updated *only* on an accepted tick, so a
 * rejected price can never move the reference the breaker measures against.
 *
 * @param {string} symbol
 * @param {{ fetchAll?: typeof fetchAll }} [deps] - injection point for tests
 * @returns {Promise<import('../types.js').OraclePriceResponse | null>}
 */
export async function pollOnce(symbol, deps = {}) {
  const fetcher = deps.fetchAll ?? fetchAll;
  const prevEma = currentEma();

  const { adr, local, ccl } = await fetcher(symbol);
  const norm = normalize(adr, local, ccl);

  if (!norm) {
    consecutiveFailures += 1;
    latestPrice = buildFallback(symbol);
    return latestPrice;
  }

  consecutiveFailures = 0;
  lastFetchOkAt = nowSeconds();
  lastPrint = norm.price;

  const verdict = evaluate(norm.price, prevEma, norm.crossCheck);
  if (verdict.status === 'valid') updateEma(norm.price);

  const ema = currentEma();
  const marketOpen = isMarketOpen();

  // A freeze outranks every other pricing mode. Otherwise: live print during the
  // session, and out of hours either the EMA (README §8) or the labelled walk.
  let price = verdict.price;
  let source = 'data912';
  let simulated = false;

  if (verdict.status !== 'frozen' && !marketOpen) {
    if (SIMULATED_WALK) {
      price = simulatedWalk(ema ?? norm.price);
      source = 'simulated';
      simulated = true;
    } else {
      price = ema ?? norm.price;
      source = 'ema_fallback';
    }
  }

  latestPrice = {
    symbol,
    price,
    ema,
    lastPrint,
    bid: norm.bid,
    ask: norm.ask,
    spread: norm.spread,
    spreadPct: norm.spreadPct,
    bookStale: norm.bookStale,
    pctChange: norm.pctChange,
    localPriceArs: norm.localPriceArs,
    adrRatio: norm.adrRatio,
    impliedCcl: norm.impliedCcl,
    reportedCcl: norm.reportedCcl,
    cclSampled: norm.cclSampled,
    cclDeviation: norm.cclDeviation,
    crossCheck: norm.crossCheck,
    deviation: verdict.deviation,
    breakerReason: verdict.reason,
    frozenAt: verdict.frozenAt,
    // `timestamp` is always when this response was published; `lastPrintAt` is
    // always when the underlying print was fetched. On the happy path the two
    // coincide (this response IS the fresh print), but keeping them distinct here
    // matches buildFallback() below, where they diverge.
    timestamp: nowSeconds(),
    lastPrintAt: lastFetchOkAt,
    status: verdict.status,
    source,
    simulated,
    marketOpen,
  };

  return latestPrice;
}

/**
 * Starts the oracle: seeds the EMA from historical closes, then polls forever.
 * @param {string} symbol
 */
export async function startOracle(symbol) {
  console.log(`[oracle] Starting for ${symbol}, polling every ${POLL_MS}ms`);
  if (SIMULATED_WALK) {
    console.log('[oracle] ORACLE_SIMULATED_WALK=true — out-of-hours prices are synthetic (source: simulated)');
  }

  // Seeded with the most recent close only, deliberately. Replaying a window of
  // daily closes through the same alpha produces a lagging average — on a trending
  // ADR it landed ~6% off the real close, which both decentres the breaker band and
  // (since the out-of-hours mark IS the EMA, README §8) marks the market away from
  // reality. The previous close is the tightest honest reference at boot.
  const closes = await fetchHistoricalCloses(symbol, SEED_CLOSES);
  if (closes) {
    lastPrint = closes[closes.length - 1];
    console.log(`[oracle] EMA seeded from the last close → $${seedEma([lastPrint])}`);
  } else {
    console.warn('[oracle] Could not seed EMA from history — cold start, breaker armed after the first tick');
  }

  await safePoll(symbol);
  pollTimer = setInterval(() => safePoll(symbol), POLL_MS);
}

/** Stops the polling loop so the process can exit cleanly. */
export function stopOracle() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

/**
 * Guarded against overlap: if a fetch is still in flight when the next tick
 * fires (e.g. the upstream feed is slow), the tick is skipped rather than
 * running a second poll concurrently, which could resolve out of order and
 * publish an older print after a newer one.
 */
async function safePoll(symbol) {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    await pollOnce(symbol);
  } catch (err) {
    console.error('[oracle] Poll iteration failed:', err.message);
  } finally {
    pollInFlight = false;
  }
}

/**
 * Returns the latest cached oracle price.
 * @returns {import('../types.js').OraclePriceResponse}
 */
export function getPrice() {
  if (!latestPrice) {
    throw new Error('Oracle not initialized yet');
  }
  return latestPrice;
}

/** Liveness detail for /health. */
export function oracleHealth() {
  return {
    symbol: latestPrice?.symbol ?? null,
    status: latestPrice?.status ?? 'uninitialized',
    source: latestPrice?.source ?? null,
    marketOpen: isMarketOpen(),
    lastFetchOkAt: lastFetchOkAt || null,
    consecutiveFailures,
    pollIntervalMs: POLL_MS,
    simulatedWalk: SIMULATED_WALK,
  };
}

/** Test hook — clears the module-level cache between cases. */
export function resetOracle() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  pollInFlight = false;
  latestPrice = null;
  lastPrint = null;
  lastFetchOkAt = 0;
  consecutiveFailures = 0;
  walkPrice = null;
}

function emptyPrice(symbol) {
  return { symbol, bid: null, ask: null, spread: null, spreadPct: null, bookStale: true,
    pctChange: 0, localPriceArs: null, adrRatio: null, impliedCcl: null, reportedCcl: null,
    cclSampled: null, cclDeviation: null, crossCheck: 'unavailable', deviation: null,
    breakerReason: null, frozenAt: null };
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

