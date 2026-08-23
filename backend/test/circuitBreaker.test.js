import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, resetBreaker, breakerState, isFrozen } from '../src/oracle/circuitBreaker.js';

// Defaults: ORACLE_CIRCUIT_BREAKER_PCT = 0.10, ORACLE_BREAKER_RELEASE_TICKS = 3
beforeEach(() => resetBreaker());

test('an in-band price passes through untouched', () => {
  const v = evaluate(105, 100);
  assert.equal(v.status, 'valid');
  assert.equal(v.price, 105);
  assert.equal(v.deviation, 0.05);
  assert.equal(isFrozen(), false);
});

test('a price beyond the threshold freezes and holds the previous EMA', () => {
  const v = evaluate(120, 100);
  assert.equal(v.status, 'frozen');
  assert.equal(v.price, 100); // the EMA, not the anomaly
  assert.equal(v.reason, 'price_deviation');
  assert.equal(v.deviation, 0.2);
  assert.ok(v.frozenAt > 0);
});

test('the freeze holds while the price stays out of band', () => {
  evaluate(120, 100);
  const again = evaluate(125, 100);
  assert.equal(again.status, 'frozen');
  assert.equal(again.price, 100);
});

test('releasing requires 3 consecutive in-band ticks', () => {
  evaluate(120, 100);
  assert.equal(evaluate(101, 100).status, 'frozen'); // 1
  assert.equal(evaluate(101, 100).status, 'frozen'); // 2
  const released = evaluate(101, 100);               // 3
  assert.equal(released.status, 'valid');
  assert.equal(released.price, 101);
  assert.equal(isFrozen(), false);
});

test('a single in-band tick does not release the freeze', () => {
  evaluate(120, 100);
  evaluate(101, 100);
  assert.equal(breakerState().consecutiveOk, 1);
  assert.equal(evaluate(130, 100).status, 'frozen'); // back out of band
  assert.equal(breakerState().consecutiveOk, 0);     // counter reset
});

test('a suspect CCL cross-check freezes even when the price looks fine', () => {
  const v = evaluate(100, 100, 'suspect');
  assert.equal(v.status, 'frozen');
  assert.equal(v.reason, 'ccl_mismatch');
});

test('without a reference EMA the first tick passes', () => {
  const v = evaluate(41.49, null);
  assert.equal(v.status, 'valid');
  assert.equal(v.deviation, null);
});
