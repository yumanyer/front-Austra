import { config } from '../config.js';

const { baseUrl: BASE_URL, timeoutMs: TIMEOUT_MS } = config.data912;
const { cclReferenceCount: REFERENCE_COUNT } = config.oracle;

// Data912 is a public API — no auth. Snapshots are Cloudflare-cached for ~30s,
// rate limit ~120 req/min. Docs: https://data912.apidocs.ar/
const EP_ADRS = '/live/usa_adrs';        // Argentine ADRs listed in the US, priced in USD
const EP_ARG_STOCKS = '/live/arg_stocks'; // BYMA local panel, priced in ARS
const EP_CCL = '/live/ccl';               // implied FX rate per ADR/local pair
const EP_HIST_USD = '/historical/usa_stocks'; // USD closes: { ticker, dates[], prices[] }

/**
 * GETs a JSON path. Never throws — returns null on any failure so callers can
 * degrade to the EMA fallback instead of crashing the poll loop.
 * @param {string} path
 * @returns {Promise<any|null>}
 */
async function getJson(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      console.warn(`[fetcher] Data912 responded ${res.status} for ${path}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[fetcher] Failed to fetch ${path}:`, err.message);
    return null;
  }
}

/**
 * The live endpoints return flat arrays of every instrument in the panel,
 * so the symbol has to be picked out of the list.
 * @param {any} list
 * @param {string} symbol
 * @param {string} key - field holding the ticker ('symbol', or 'ticker_usa' for /live/ccl)
 */
function pickSymbol(list, symbol, key = 'symbol') {
  if (!Array.isArray(list)) return null;
  return list.find((row) => row?.[key] === symbol) ?? null;
}

/**
 * Primary price source: the ADR tick, already denominated in USD.
 * @param {string} symbol - ADR ticker, e.g. "YPF"
 * @returns {Promise<import('../types.js').Data912Tick | null>}
 */
export async function fetchAdrTick(symbol) {
  const tick = pickSymbol(await getJson(EP_ADRS), symbol);
  if (!tick || typeof tick.c !== 'number') {
    if (tick) console.warn(`[fetcher] Unexpected ADR tick shape for ${symbol}`, tick);
    return null;
  }
  return tick;
}

/**
 * Local BYMA tick in ARS — used only for the CCL cross-check, never as the price.
 * @param {string} symbol
 * @returns {Promise<import('../types.js').Data912Tick | null>}
 */
export async function fetchLocalTick(symbol) {
  const tick = pickSymbol(await getJson(EP_ARG_STOCKS), symbol);
  if (!tick || typeof tick.c !== 'number') return null;
  return tick;
}

/**
 * Market-wide reference CCL (contado con liquidación) rate.
 *
 * Deliberately NOT the traded ticker's own CCL row: YPF is absent from this feed
 * entirely (245 entries, no YPF), which would silently disable the cross-check.
 * The CCL is an FX rate, near-identical across liquid pairs — measured, the median
 * over the 10 most traded is 1593.02 with 1.04% spread — so a median over the most
 * liquid pairs is both a valid reference and works for any asset, including the
 * commodities that will never appear here.
 *
 * @returns {Promise<{ close: number, sampled: number } | null>}
 */
export async function fetchReferenceCcl() {
  const rows = await getJson(EP_CCL);
  if (!Array.isArray(rows)) return null;

  const liquid = rows
    .filter((r) => Number.isFinite(r?.volume_rank) && Number.isFinite(r?.CCL_close) && r.CCL_close > 0)
    .sort((a, b) => a.volume_rank - b.volume_rank)
    .slice(0, REFERENCE_COUNT)
    .map((r) => r.CCL_close)
    .sort((a, b) => a - b);

  if (!liquid.length) return null;
  return { close: median(liquid), sampled: liquid.length };
}

/** Median of an already-ascending list. */
function median(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Last `n` daily USD closes of the ADR, used to seed the EMA at boot so the
 * circuit breaker is armed from the first tick.
 * NOTE: /historical/stocks/{symbol} is the ARS series — this endpoint is the USD one.
 * @param {string} symbol
 * @param {number} n
 * @returns {Promise<number[] | null>}
 */
export async function fetchHistoricalCloses(symbol, n = 20) {
  const data = await getJson(`${EP_HIST_USD}/${symbol}`);
  if (!data || !Array.isArray(data.prices)) return null;
  const closes = data.prices
    .slice(-n)
    .map((p) => Number(p))
    .filter((p) => Number.isFinite(p) && p > 0);
  return closes.length ? closes : null;
}

/**
 * Fetches the three live feeds concurrently. A failure in the local tick or the
 * reference rate must not block the ADR price — the cross-check just goes
 * unavailable.
 *
 * @param {string} symbol - ADR ticker (e.g. "YPF")
 * @param {string} [localSymbol] - BYMA ticker, which differs (e.g. "YPFD")
 * @returns {Promise<{ adr: object|null, local: object|null, ccl: object|null }>}
 */
export async function fetchAll(symbol, localSymbol = config.oracle.localSymbol) {
  const results = await Promise.allSettled([
    fetchAdrTick(symbol),
    fetchLocalTick(localSymbol),
    fetchReferenceCcl(),
  ]);
  const value = (r) => (r.status === 'fulfilled' ? r.value : null);
  return { adr: value(results[0]), local: value(results[1]), ccl: value(results[2]) };
}
