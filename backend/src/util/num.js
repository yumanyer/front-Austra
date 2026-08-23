/** Shared numeric helpers. Prices are handled with 1e6 precision end to end. */

export function round6(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return NaN;
  return Math.round(v * 1_000_000) / 1_000_000;
}
