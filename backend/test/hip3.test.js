import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetOracle } from '../src/hip3/publisher.js';

// Defaults: HIP3_DEX=arg, HIP3_COIN=YPF, HIP3_SZ_DECIMALS=2
const base = { symbol: 'YPF', price: 50.298001, lastPrint: 51.25, status: 'valid' };

test('the action carries the dex and both price legs', () => {
  const a = buildSetOracle(base);
  assert.equal(a.dex, 'arg');
  assert.deepEqual(a.oraclePxs, [['arg:YPF', '50.298']]);
  assert.deepEqual(a.markPxs, [[['arg:YPF', '51.25']]]);
  // Required once the asset is listed; HyperCore rejects an empty list.
  assert.deepEqual(a.externalPerpPxs, [['arg:YPF', '51.25']]);
});

test('markPxs is an outer list of inner lists', () => {
  const a = buildSetOracle(base);
  assert.ok(Array.isArray(a.markPxs[0]), 'markPxs must be nested one level deeper than oraclePxs');
  assert.ok(Array.isArray(a.markPxs[0][0]));
  assert.equal(a.markPxs[0][0].length, 2);
});

test('prices are formatted to Hyperliquid tick rules, not raw floats', () => {
  // szDecimals=2 → max 4 decimals, then capped at 5 significant figures
  assert.deepEqual(buildSetOracle({ ...base, price: 1234.5678 }).oraclePxs, [['arg:YPF', '1234.5']]);
  // integers are exempt from the significant-figure cap
  assert.deepEqual(buildSetOracle({ ...base, price: 8150 }).oraclePxs, [['arg:YPF', '8150']]);
  // and they go out as strings, never numbers
  assert.equal(typeof buildSetOracle(base).oraclePxs[0][1], 'string');
  // and the key is the qualified name HyperCore expects
  assert.equal(buildSetOracle(base).oraclePxs[0][0], 'arg:YPF');
});

test('oracle and mark diverge while the breaker is frozen', () => {
  // The breaker holds 50.3 while the venue printed a 66.6 spike.
  const frozen = { symbol: 'YPF', price: 50.3, lastPrint: 66.6, status: 'frozen' };
  const a = buildSetOracle(frozen);
  assert.deepEqual(a.oraclePxs, [['arg:YPF', '50.3']], 'funding/liquidations use the held price');
  assert.deepEqual(a.markPxs, [[['arg:YPF', '66.6']]], 'the mark still reflects the real print');
});

test('mark falls back to the published price when there is no print', () => {
  const a = buildSetOracle({ ...base, lastPrint: null });
  assert.deepEqual(a.markPxs, [[['arg:YPF', '50.298']]]);
});

test('tuples are sorted lexicographically by coin', () => {
  // Sorting is trivial with one asset, but the ordering contract must hold before
  // signing — HyperCore rejects unsorted lists.
  const a = buildSetOracle(base);
  const coins = a.oraclePxs.map(([c]) => c);
  assert.deepEqual(coins, [...coins].sort());
});

test('an unusable price is rejected rather than sent', () => {
  assert.throws(() => buildSetOracle({ ...base, price: 0 }), /truncated to 0/);
  assert.throws(() => buildSetOracle({ ...base, price: NaN }), /not finite/);
  assert.throws(() => buildSetOracle({ ...base, price: Infinity }), /not finite/);
});
