import { config } from '../config.js';
import { round6 } from '../util/num.js';

const {
  adrRatio: ADR_RATIO,
  spreadMaxPct: SPREAD_MAX_PCT,
  cclMaxDeviationPct: CCL_MAX_DEVIATION_PCT,
} = config.oracle;

/**
 * Normalizes the raw feeds into the price object the rest of the pipeline consumes.
 *
 * The ADR trades on the NYSE, so `c` is already USD — no FX conversion is applied
 * to the price itself. What this layer does add is validation:
 *
 *  1. Book sanity. Outside NYSE hours the ADR book comes back absurdly wide
 *     (observed YPF: bid 47.99 / ask 56.27 against a 51.25 print). Such a book
 *     is flagged `bookStale` and a mid price is never derived from it.
 *  2. CCL cross-check. `localArs * ADR_RATIO / adrUsd` must reproduce the market
 *     reference FX rate Data912 reports independently (verified for YPF:
 *     8150 * 10 / 51.25 = 1590.24 against a reference of 1593.02, a 0.17% gap).
 *     A mismatch means one of the two legs is wrong, which the circuit breaker
 *     treats as a freeze signal. Note the ADR ratio is 10:1 for YPF as well — at
 *     1:1 the implied rate would be off by 90%.
 *
 * @param {import('../types.js').Data912Tick | null} adrTick - USD tick (primary)
 * @param {import('../types.js').Data912Tick | null} [localTick] - ARS tick (cross-check)
 * @param {{ close: number, sampled?: number } | null} [ccl] - market reference CCL rate
 * @returns {import('../types.js').NormalizedTick | null} null if the tick is unusable
 */
export function normalize(adrTick, localTick = null, ccl = null) {
  const price = round6(adrTick?.c);
  if (!Number.isFinite(price) || price <= 0) return null;

  const bid = round6(adrTick.px_bid ?? 0);
  const ask = round6(adrTick.px_ask ?? 0);
  const spread = round6(ask - bid);
  const hasBook = bid > 0 && ask > 0 && spread >= 0;
  const spreadPct = hasBook ? round6(spread / price) : null;
  const bookStale = !hasBook || spreadPct > SPREAD_MAX_PCT;

  const localPriceArs = Number.isFinite(localTick?.c) && localTick.c > 0 ? round6(localTick.c) : null;
  const reportedCcl = Number.isFinite(ccl?.close) && ccl.close > 0 ? round6(ccl.close) : null;

  let impliedCcl = null;
  let cclDeviation = null;
  /** @type {"ok"|"suspect"|"unavailable"} */
  let crossCheck = 'unavailable';

  if (localPriceArs !== null && reportedCcl !== null) {
    impliedCcl = round6((localPriceArs * ADR_RATIO) / price);
    cclDeviation = round6(Math.abs(impliedCcl - reportedCcl) / reportedCcl);
    crossCheck = cclDeviation > CCL_MAX_DEVIATION_PCT ? 'suspect' : 'ok';
  }

  return {
    symbol: adrTick.symbol,
    price,
    bid,
    ask,
    spread,
    spreadPct,
    bookStale,
    pctChange: adrTick.pct_change ?? 0,
    localPriceArs,
    adrRatio: ADR_RATIO,
    impliedCcl,
    reportedCcl,
    cclSampled: reportedCcl === null ? null : ccl.sampled ?? null,
    cclDeviation,
    crossCheck,
  };
}

