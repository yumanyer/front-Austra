import { config } from '../config.js';
import { round6 } from '../util/num.js';

const { emaAlpha: alpha } = config.oracle;

let _ema = null;

/**
 * Updates and returns the EMA for a new price observation.
 * On the first call the EMA is seeded with the initial price.
 *
 * Only accepted prices should reach this function — feeding it a price the
 * circuit breaker rejected would drag the reference toward the anomaly and
 * release the freeze on its own.
 * @param {number} price
 * @returns {number} current EMA
 */
export function updateEma(price) {
  if (_ema === null) {
    _ema = price;
  } else {
    _ema = alpha * price + (1 - alpha) * _ema;
  }
  return round6(_ema);
}

/**
 * Seeds the EMA from historical closes so the circuit breaker has a reference
 * on the very first live tick instead of starting at deviation 0.
 * @param {number[]} closes - oldest to newest
 * @returns {number|null} seeded EMA, or null if there was nothing usable
 */
export function seedEma(closes) {
  if (!Array.isArray(closes)) return null;
  const usable = closes.filter((c) => Number.isFinite(c) && c > 0);
  if (!usable.length) return null;

  _ema = null;
  for (const close of usable) updateEma(close);
  return currentEma();
}

export function currentEma() {
  return _ema === null ? null : round6(_ema);
}

export function resetEma() {
  _ema = null;
}

