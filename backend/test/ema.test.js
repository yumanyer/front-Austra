import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { updateEma, currentEma, resetEma, seedEma } from '../src/oracle/ema.js';

// Default ORACLE_EMA_ALPHA = 0.2
beforeEach(() => resetEma());

test('first observation seeds the EMA with itself', () => {
  assert.equal(updateEma(100), 100);
  assert.equal(currentEma(), 100);
});

test('subsequent observations apply alpha', () => {
  updateEma(100);
  assert.equal(updateEma(110), 102); // 0.2*110 + 0.8*100
});

test('currentEma is null before any observation', () => {
  assert.equal(currentEma(), null);
});

test('seedEma replays closes through the same alpha', () => {
  assert.equal(seedEma([100, 110]), 102);
});

test('seedEma discards non-finite and non-positive closes', () => {
  assert.equal(seedEma([NaN, 0, -5, 100, null, 110]), 102);
});

test('seedEma leaves an existing EMA untouched when there is nothing usable', () => {
  updateEma(41.49);
  assert.equal(seedEma([]), null);
  assert.equal(currentEma(), 41.49);
});
