import assert from "node:assert/strict";
import { getHealth, getMarket, getOracle, loadSnapshot } from "../js/api/index.js";
import { ApiError, requestJson } from "../js/api/client.js";
import { normalizeHealth, normalizeMarket, normalizeOracle } from "../js/api/normalize.js";
import { normalizeTimestamp, relativeTime } from "../js/utils/time.js";
import { formatRatioPercent, valueOrDash } from "../js/utils/format.js";
import { PRESENTATION_DATA, getPresentationHistory } from "../js/presentation-data.js";

const oracle = normalizeOracle({
  symbol: "YPF",
  price: 42.315,
  ema: 42.301,
  lastPrint: 42.32,
  bid: 42.3,
  ask: 42.34,
  spread: 0.04,
  reportedCcl: 1180,
  impliedCcl: 1181.2,
  cclSampled: 1179.8,
  cclDeviation: 0.1,
  crossCheck: { status: "PASS" },
  status: "VALID",
  source: "Data912",
  marketOpen: true,
  spreadPct: 0.001,
  bookStale: false,
  pctChange: 1.24,
  localPriceArs: 8150,
  adrRatio: 10,
  timestamp: 1_756_000_000,
  lastPrintAt: 1_756_000_000,
  breaker: { frozen: false, thresholdPct: 0.1, consecutiveOk: 3, releaseTicks: 3 },
});
assert.equal(oracle.symbol, "YPF");
assert.equal(oracle.price, 42.315);
assert.equal(oracle.ema, 42.301);
assert.equal(oracle.circuitBreaker.frozen, false);
assert.equal(oracle.circuitBreaker.thresholdPct, 0.1);
assert.equal(formatRatioPercent(oracle.circuitBreaker.thresholdPct), "+10.00%");
assert.equal(valueOrDash(0, formatRatioPercent), "0.00%");
assert.equal(PRESENTATION_DATA.openInterest, "$2.84M");
assert.equal(PRESENTATION_DATA.volume24h, "$1.27M");
for (const period of ["1H", "1D", "1W"]) {
  const presentationHistory = getPresentationHistory(period, { price: 51.25, ema: 51.249986 });
  assert.equal(presentationHistory.length > 1, true);
  assert.equal(presentationHistory.at(-1).price, 51.25);
  assert.equal(presentationHistory.at(-1).ema, 51.249986);
}
assert.notEqual(getPresentationHistory("1H")[0].timestamp, getPresentationHistory("1D")[0].timestamp);
assert.equal(oracle.reportedCcl, 1180);
assert.equal(oracle.ccl, undefined);
assert.equal(oracle.impliedCcl, 1181.2);
assert.equal(oracle.crossCheck, "PASS");
assert.equal(oracle.status, "VALID");
assert.equal(oracle.source, "Data912");
assert.equal(oracle.marketOpen, true);
assert.equal(oracle.spreadPct, 0.001);
assert.equal(oracle.bookStale, false);
assert.equal(oracle.pctChange, 1.24);
assert.equal(oracle.localPriceArs, 8150);
assert.equal(oracle.adrRatio, 10);
assert.equal(typeof oracle.timestamp, "number");
assert.equal(typeof oracle.lastPrintAt, "number");
assert.equal(typeof oracle.freshness, "string");

const incompleteOracle = normalizeOracle({ price: 42.315, breaker: { frozen: true, reason: "stale source" } });
assert.equal(incompleteOracle.circuitBreaker.status, "FROZEN");
assert.equal(incompleteOracle.circuitBreaker.reason, "stale source");
assert.equal(incompleteOracle.ema, undefined);
assert.equal(incompleteOracle.reportedCcl, undefined);
assert.equal(incompleteOracle.ccl, undefined);
assert.equal(incompleteOracle.crossCheck, undefined);

const market = normalizeMarket({
  symbol: "YPF-PERP",
  markPrice: 42.32,
  indexPrice: 42.315,
  fundingRate: 0.01,
  maxLeverage: 5,
  marketStatus: "LIVE",
  hip3: { enabled: true, status: "ACTIVE", market: "YPF-PERP" },
  oracleStatus: "valid",
  oracleSource: "data912",
  simulated: false,
  lastPushTx: null,
  lastPushAt: null,
  series: [{ timestamp: "2026-08-23T00:00:00Z", price: 42.1, ema: 42.0 }],
});
assert.equal(market.symbol, "YPF-PERP");
assert.equal(market.markPrice, 42.32);
assert.equal(market.indexPrice, 42.315);
assert.equal(market.fundingRate, 0.01);
assert.equal(market.maxLeverage, 5);
assert.equal(market.marketStatus, "LIVE");
assert.equal(market.hip3.enabled, true);
assert.equal(market.hip3.status, "ACTIVE");
assert.equal(market.oracleStatus, "valid");
assert.equal(market.oracleSource, "data912");
assert.equal(market.simulated, false);
assert.equal(market.lastPushTx, undefined);
assert.equal(market.lastPushAt, undefined);
assert.equal(market.history, undefined);
assert.equal(market.volume24h, undefined);
assert.equal(market.openInterest, undefined);

const zeroFundingMarket = normalizeMarket({ symbol: "YPF-PERP", markPrice: 42.32, fundingRate: 0 });
assert.equal(zeroFundingMarket.fundingRate, 0);

const marketWithoutHistory = normalizeMarket({ symbol: "YPF-PERP", markPrice: 42.32 });
assert.equal(marketWithoutHistory.history, undefined);
assert.equal(marketWithoutHistory.openInterest, undefined);
assert.equal(marketWithoutHistory.hyperCoreStatus, undefined);
assert.equal(marketWithoutHistory.hyperEvmStatus, undefined);

const health = normalizeHealth({
  status: "ok",
  timestamp: 1_756_000_000,
  oracle: { symbol: "YPF", status: "valid", source: "data912", lastFetchOkAt: 1_756_000_000 },
  breaker: { frozen: false, thresholdPct: 0.1, consecutiveOk: 3, releaseTicks: 3 },
  hip3: { enabled: true, dryRun: true, isTestnet: true },
  pusher: { enabled: false },
});
assert.equal(health.status, "ok");
assert.equal(health.oracle.status, "valid");
assert.equal(health.oracle.source, "data912");
assert.equal(health.breaker.frozen, false);
assert.equal(health.breaker.thresholdPct, 0.1);
assert.equal(health.hip3.enabled, true);
assert.equal(health.pusher.enabled, false);
const healthWithoutOptional = normalizeHealth({ status: "CONNECTED" });
assert.equal(healthWithoutOptional.hip3?.enabled, undefined);
assert.equal(healthWithoutOptional.pusher?.enabled, undefined);

const seconds = 1_700_000_000;
assert.equal(normalizeTimestamp(seconds), seconds * 1000);
assert.equal(normalizeTimestamp(seconds * 1000), seconds * 1000);
assert.equal(normalizeTimestamp("2026-08-23T00:00:00Z"), Date.parse("2026-08-23T00:00:00Z"));
assert.equal(normalizeTimestamp(undefined), undefined);
assert.equal(normalizeTimestamp(null), undefined);
assert.equal(normalizeTimestamp("not-a-date"), undefined);
assert.equal(relativeTime(Date.now() - 5_000, Date.now()), "5s ago");

const originalFetch = globalThis.fetch;
const originalConfig = globalThis.AUSTRAL_CONFIG;

try {
  let fetchCalls = 0;
  globalThis.AUSTRAL_CONFIG = { USE_DEMO_DATA: true };
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Demo mode must not fetch");
  };
  const demoSnapshot = await loadSnapshot();
  assert.equal(demoSnapshot.mode, "simulated");
  assert.equal(fetchCalls, 0);
assert.equal(demoSnapshot.market.data.history, undefined);
assert.equal(demoSnapshot.market.data.volume24h, undefined);
assert.equal(demoSnapshot.market.data.openInterest, undefined);
  assert.equal(demoSnapshot.oracle.data.crossCheck, "ok");
  assert.equal(demoSnapshot.oracle.data.circuitBreaker.status, "CLEAR");
  assert.equal(demoSnapshot.oracle.data.circuitBreaker.thresholdPct, 0.1);
  assert.equal(demoSnapshot.oracle.data.circuitBreaker.releaseTicks, 3);

  globalThis.AUSTRAL_CONFIG = { API_URL: "http://backend.test", USE_DEMO_DATA: false, REQUEST_TIMEOUT_MS: 10 };
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("offline");
  };
  const realSnapshot = await loadSnapshot();
  assert.equal(realSnapshot.mode, "real");
  assert.equal(realSnapshot.health.status, "error");
  assert.equal(realSnapshot.oracle.status, "error");
  assert.equal(realSnapshot.market.status, "error");
  assert.equal(realSnapshot.oracle.data, null);
  assert.equal(realSnapshot.oracle.errorCode, "network");

  globalThis.fetch = async () => ({ ok: false, status: 503 });
  const httpResult = await getHealth();
  assert.equal(httpResult.status, "error");
  assert.equal(httpResult.errorCode, "http");

  globalThis.fetch = async () => ({ ok: true, json: async () => { throw new Error("bad json"); } });
  const jsonResult = await getOracle();
  assert.equal(jsonResult.status, "error");
  assert.equal(jsonResult.errorCode, "invalid_json");

  globalThis.fetch = async () => ({ ok: true, json: async () => [] });
  const payloadResult = await getMarket();
  assert.equal(payloadResult.status, "error");
  assert.equal(payloadResult.errorCode, "invalid_payload");

  globalThis.fetch = async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); };
  const abortController = new AbortController();
  abortController.abort();
  await assert.rejects(() => requestJson("/health", { signal: abortController.signal }), (error) => {
    assert.ok(error instanceof ApiError);
    return error.code === "aborted";
  });

  globalThis.fetch = async (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(Object.assign(new Error("timed out"), { name: "AbortError" })), { once: true });
  });
  await assert.rejects(() => requestJson("/health", { timeout: 1 }), (error) => {
    assert.ok(error instanceof ApiError);
    return error.code === "timeout";
  });
} finally {
  globalThis.fetch = originalFetch;
  if (originalConfig === undefined) delete globalThis.AUSTRAL_CONFIG;
  else globalThis.AUSTRAL_CONFIG = originalConfig;
}

console.log("AustralFinance API/data layer smoke test passed");
