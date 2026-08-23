import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pollOnce, resetOracle, isMarketOpen } from '../src/oracle/index.js';
import { seedEma, currentEma, resetEma } from '../src/oracle/ema.js';
import { resetBreaker } from '../src/oracle/circuitBreaker.js';

/** Fake feed so the pipeline can be driven without touching the network. */
function feed(adrPrice, { local = { symbol: 'YPFD', c: 8150 }, ccl = { close: 1593.02395, sampled: 10 } } = {}) {
  return async () => ({
    adr: { symbol: 'YPF', c: adrPrice, px_bid: adrPrice - 0.01, px_ask: adrPrice + 0.01, pct_change: 0 },
    local,
    ccl,
  });
}

const empty = async () => ({ adr: null, local: null, ccl: null });

beforeEach(() => {
  resetOracle();
  resetEma();
  resetBreaker();
});

test('an accepted tick moves the EMA', async () => {
  seedEma([51.25]);
  await pollOnce('YPF', { fetchAll: feed(52.25) });
  assert.equal(currentEma(), 51.45); // 0.2*52.25 + 0.8*51.25
});

test('a rejected spike does NOT move the EMA', async () => {
  seedEma([51.25]);
  // Cross-check disabled (no local leg) so the price signal is what fires.
  const res = await pollOnce('YPF', { fetchAll: feed(70, { local: null }) });

  assert.equal(res.status, 'frozen');
  assert.equal(res.breakerReason, 'price_deviation');
  assert.equal(res.price, 51.25);      // the held EMA, not the spike
  assert.equal(currentEma(), 51.25);   // regression: the EMA must be untouched
  assert.equal(res.lastPrint, 70);     // but the raw print is still reported
});

test('a spike inconsistent with the local leg freezes on the cross-check', async () => {
  seedEma([51.25]);
  const res = await pollOnce('YPF', { fetchAll: feed(55.5) }); // +8.5%, inside the band
  assert.equal(res.status, 'frozen');
  assert.equal(res.breakerReason, 'ccl_mismatch');
  assert.equal(currentEma(), 51.25);
});

test('mark and index diverge while frozen', async () => {
  seedEma([51.25]);
  const res = await pollOnce('YPF', { fetchAll: feed(70, { local: null }) });
  assert.notEqual(res.price, res.lastPrint);
});

test('a failed fetch falls back to the EMA without throwing', async () => {
  seedEma([51.25]);
  const res = await pollOnce('YPF', { fetchAll: empty });
  assert.equal(res.price, 51.25);
  assert.ok(['ema_fallback', 'simulated'].includes(res.source));
});

test('a fetch failure while frozen keeps reporting frozen, from the breaker itself', async () => {
  seedEma([51.25]);
  await pollOnce('YPF', { fetchAll: feed(70, { local: null }) }); // freezes, holds 51.25
  const res = await pollOnce('YPF', { fetchAll: empty }); // feed drops
  // Must reflect the breaker's live state (isFrozen()), not a cached label —
  // the two happen to agree here, but only querying the breaker keeps that true
  // as the breaker's own state evolves (e.g. a release or a manual reset).
  assert.equal(res.status, 'frozen');
  assert.equal(res.price, 51.25);
});

test('a failed fetch with no baseline leaves the oracle uninitialized', async () => {
  const res = await pollOnce('YPF', { fetchAll: empty });
  assert.equal(res, null); // routes answer 503 rather than inventing a price
});

test('the CCL cross-check is reported on the published price', async () => {
  seedEma([51.25]);
  const res = await pollOnce('YPF', { fetchAll: feed(51.25) });
  assert.equal(res.crossCheck, 'ok');
  assert.ok(Math.abs(res.impliedCcl - 1590.2439) < 0.01);
  assert.equal(res.status, 'valid');
});

test('isMarketOpen tracks the NYSE session in America/New_York', () => {
  // Friday 2026-08-21, EDT (UTC-4)
  assert.equal(isMarketOpen(new Date('2026-08-21T14:00:00Z')), true);  // 10:00 ET
  assert.equal(isMarketOpen(new Date('2026-08-21T13:00:00Z')), false); // 09:00 ET, pre-open
  assert.equal(isMarketOpen(new Date('2026-08-21T20:30:00Z')), false); // 16:30 ET, after close
  // Weekend — the whole hackathon window
  assert.equal(isMarketOpen(new Date('2026-08-22T14:00:00Z')), false);
  assert.equal(isMarketOpen(new Date('2026-08-23T14:00:00Z')), false);
  // January, EST (UTC-5): the hand-rolled month offset used to get this wrong
  assert.equal(isMarketOpen(new Date('2026-01-15T14:00:00Z')), false); // 09:00 ET
  assert.equal(isMarketOpen(new Date('2026-01-15T14:35:00Z')), true);  // 09:35 ET
});
