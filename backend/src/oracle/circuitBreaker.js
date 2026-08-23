import { config } from '../config.js';
import { round6 } from '../util/num.js';

const { breakerPct: THRESHOLD, breakerReleaseTicks: RELEASE_TICKS } = config.oracle;

let frozen = false;
let frozenPrice = null;
let frozenAt = null;
let reason = null;
let consecutiveOk = 0;

/**
 * Decides whether an incoming price can be published.
 *
 * `ema` MUST be the EMA as it stood *before* this tick — the caller updates the
 * EMA only when the verdict is 'valid'. Judging a price against an EMA that
 * already absorbed it dampens the measured deviation by `alpha` and lets a
 * sustained anomaly walk the reference to itself.
 *
 * Two independent freeze signals:
 *  - 'price_deviation': the print moved more than THRESHOLD away from the EMA.
 *  - 'ccl_mismatch': the implied FX rate disagrees with the reported one, so one
 *    of the two price legs is untrustworthy even if the number looks plausible.
 *
 * Releasing requires RELEASE_TICKS consecutive in-band ticks. Because the EMA is
 * held still while frozen, a genuine repricing beyond the threshold stays frozen
 * until it comes back into band — deliberate for a breaker, and the reason the
 * threshold is configurable.
 *
 * @param {number} price
 * @param {number|null} ema - EMA prior to this tick
 * @param {"ok"|"suspect"|"unavailable"} [crossCheck]
 * @returns {{ price: number, status: "valid"|"frozen", deviation: number|null, reason: string|null, frozenAt: number|null }}
 */
export function evaluate(price, ema, crossCheck = 'unavailable') {
  const hasReference = Number.isFinite(ema) && ema > 0;
  const deviation = hasReference ? round6(Math.abs(price - ema) / ema) : null;
  const outOfBand = deviation !== null && deviation > THRESHOLD;
  const suspectCross = crossCheck === 'suspect';

  if (outOfBand || suspectCross) {
    if (!frozen) {
      frozen = true;
      // Fall back to the incoming price only when there is no reference yet
      // (first tick with a bad cross-check) — there is nothing better to hold.
      frozenPrice = hasReference ? round6(ema) : price;
      frozenAt = nowSeconds();
      reason = outOfBand ? 'price_deviation' : 'ccl_mismatch';
      const detail = outOfBand
        ? `deviation ${(deviation * 100).toFixed(2)}% > threshold ${(THRESHOLD * 100).toFixed(0)}%`
        : 'CCL cross-check mismatch';
      console.warn(`[circuit-breaker] FROZEN — ${detail} (holding $${frozenPrice})`);
    }
    consecutiveOk = 0;
    return { price: frozenPrice, status: 'frozen', deviation, reason, frozenAt };
  }

  if (frozen) {
    consecutiveOk += 1;
    if (consecutiveOk < RELEASE_TICKS) {
      return { price: frozenPrice, status: 'frozen', deviation, reason, frozenAt };
    }
    console.log(`[circuit-breaker] RELEASED after ${consecutiveOk} in-band ticks`);
    frozen = false;
    frozenPrice = null;
    frozenAt = null;
    reason = null;
    consecutiveOk = 0;
  }

  return { price, status: 'valid', deviation, reason: null, frozenAt: null };
}

export function isFrozen() {
  return frozen;
}

/** Breaker state for /health. */
export function breakerState() {
  return {
    frozen,
    frozenPrice,
    frozenAt,
    reason,
    consecutiveOk,
    thresholdPct: THRESHOLD,
    releaseTicks: RELEASE_TICKS,
  };
}

export function resetBreaker() {
  frozen = false;
  frozenPrice = null;
  frozenAt = null;
  reason = null;
  consecutiveOk = 0;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

