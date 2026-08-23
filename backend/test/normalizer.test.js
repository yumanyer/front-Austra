import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../src/oracle/normalizer.js';

// Real payloads captured from Data912 on 2026-08-22 (market closed).
// Note the local leg trades as YPFD, a different ticker from the ADR.
const ADR_YPF = { symbol: 'YPF', q_bid: 1, px_bid: 47.99, px_ask: 56.27, q_ask: 13, v: 19608, q_op: 72, c: 51.25, pct_change: 0.65 };
const LOCAL_YPF = { symbol: 'YPFD', q_bid: 35, px_bid: 8140, px_ask: 8155, q_ask: 4900, v: 1531519, q_op: 8904, c: 8150, pct_change: 1.3 };
// Market reference rate: the median CCL_close over the 10 most liquid pairs.
const CCL_REF = { close: 1593.02395, sampled: 10 };

test('the ADR last print is used as the price, in USD, untouched', () => {
  const n = normalize(ADR_YPF, LOCAL_YPF, CCL_REF);
  assert.equal(n.price, 51.25);
  assert.equal(n.pctChange, 0.65);
});

test('the off-hours ADR book is flagged as stale', () => {
  const n = normalize(ADR_YPF, LOCAL_YPF, CCL_REF);
  // bid 47.99 / ask 56.27 on a 51.25 print — a 16% spread
  assert.equal(n.bookStale, true);
  assert.ok(n.spreadPct > 0.15, `spreadPct ${n.spreadPct}`);
});

test('a tight book is not flagged', () => {
  const n = normalize({ ...ADR_YPF, px_bid: 51.24, px_ask: 51.26 }, LOCAL_YPF, CCL_REF);
  assert.equal(n.bookStale, false);
  assert.equal(n.spread, 0.02);
});

test('a missing book is treated as stale', () => {
  const n = normalize({ ...ADR_YPF, px_bid: 0, px_ask: 0 });
  assert.equal(n.bookStale, true);
  assert.equal(n.spreadPct, null);
});

test('the implied CCL reproduces the reference rate for real data', () => {
  const n = normalize(ADR_YPF, LOCAL_YPF, CCL_REF);
  // 8150 ARS * 10 local shares per ADR / 51.25 USD.
  // The ratio is 10:1 for YPF too — at 1:1 the implied rate would be off by 90%.
  assert.ok(Math.abs(n.impliedCcl - 1590.2439) < 0.01, `implied ${n.impliedCcl}`);
  assert.equal(n.crossCheck, 'ok');
  assert.ok(n.cclDeviation < 0.003, `deviation ${n.cclDeviation}`);
  assert.equal(n.adrRatio, 10);
  assert.equal(n.cclSampled, 10);
});

test('a disagreeing reference rate marks the tick suspect', () => {
  const n = normalize(ADR_YPF, LOCAL_YPF, { close: 1200, sampled: 10 });
  assert.equal(n.crossCheck, 'suspect');
  assert.ok(n.cclDeviation > 0.03);
});

test('an ADR price inconsistent with the local leg is caught', () => {
  // ADR mispriced ~30% high while the local leg is unchanged
  const n = normalize({ ...ADR_YPF, c: 66.6 }, LOCAL_YPF, CCL_REF);
  assert.equal(n.crossCheck, 'suspect');
});

test('the cross-check degrades to unavailable without both legs', () => {
  assert.equal(normalize(ADR_YPF, null, CCL_REF).crossCheck, 'unavailable');
  assert.equal(normalize(ADR_YPF, LOCAL_YPF, null).crossCheck, 'unavailable');
  assert.equal(normalize(ADR_YPF).impliedCcl, null);
  assert.equal(normalize(ADR_YPF).cclSampled, null);
});

test('an unusable tick normalizes to null', () => {
  assert.equal(normalize(null), null);
  assert.equal(normalize({ symbol: 'YPF', c: 0 }), null);
  assert.equal(normalize({ symbol: 'YPF', c: -1 }), null);
  assert.equal(normalize({ symbol: 'YPF' }), null);
});
