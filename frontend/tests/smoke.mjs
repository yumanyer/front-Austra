import assert from "node:assert/strict";
import { loadSnapshot, normalizeMarket, normalizeOracle } from "../js/api.js";

const oracle = normalizeOracle({
  price: 42.315,
  ema: 42.301,
  lastPrint: 42.32,
  bid: 42.3,
  ask: 42.34,
  spread: 0.04,
  ccl: 1180,
  status: "VALID",
  source: "Data912",
  marketOpen: true,
  circuitBreaker: { status: "CLEAR", threshold: 10, deviation: 1.8, releaseTicks: "3 / 3" },
});
assert.equal(oracle.price, 42.315);
assert.equal(oracle.ema, 42.301);
assert.equal(oracle.circuitBreaker.status, "CLEAR");
assert.equal(oracle.source, "Data912");

const market = normalizeMarket({
  markPrice: 42.32,
  indexPrice: 42.315,
  fundingRate: 0.01,
  maxLeverage: 5,
  marketStatus: "LIVE",
  hip3Status: "ACTIVE",
  series: [{ timestamp: "2026-08-23T00:00:00Z", price: 42.1, ema: 42.0 }],
});
assert.equal(market.markPrice, 42.32);
assert.equal(market.indexPrice, 42.315);
assert.equal(market.history.length, 1);
assert.equal(market.volume24h, undefined);

const requestedPaths = [];
globalThis.window = {
  AUSTRAL_CONFIG: { API_URL: "https://api.example.test", USE_DEMO_DATA: false },
  setTimeout,
  clearTimeout,
};
globalThis.fetch = async (url) => {
  requestedPaths.push(url);
  const payloads = {
    "https://api.example.test/health": { status: "CONNECTED", version: "test" },
    "https://api.example.test/oracle/price/YPF": { price: 42.5, status: "VALID" },
    "https://api.example.test/market/YPF-PERP": { markPrice: 42.5, marketStatus: "LIVE" },
  };
  return {
    ok: true,
    async json() {
      return payloads[url];
    },
  };
};

const snapshot = await loadSnapshot();
assert.deepEqual(requestedPaths.sort(), [
  "https://api.example.test/health",
  "https://api.example.test/market/YPF-PERP",
  "https://api.example.test/oracle/price/YPF",
]);
assert.equal(snapshot.health.data.status, "CONNECTED");
assert.equal(snapshot.oracle.data.price, 42.5);
assert.equal(snapshot.market.data.markPrice, 42.5);
assert.ok(snapshot.fetchedAt);

console.log("AustralFinance API normalization and snapshot smoke test passed");
