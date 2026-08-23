import { isAvailable } from "../utils/format.js";
import { normalizeTimestamp, relativeTime } from "../utils/time.js";

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function unwrapPayload(payload, keys = []) {
  const root = objectOrEmpty(payload);
  for (const key of keys) {
    if (root[key] && typeof root[key] === "object") return root[key];
  }
  return root.data && typeof root.data === "object" ? root.data : root;
}

function firstValue(source, keys) {
  for (const key of keys) {
    if (isAvailable(source?.[key])) return source[key];
  }
  return undefined;
}

function normalizeTimestampFields(source) {
  const timestampInput = firstValue(source, ["timestamp", "updatedAt", "updated_at", "lastUpdated"]);
  const lastPrintInput = firstValue(source, ["lastPrintAt", "last_print_at"]);
  const timestamp = normalizeTimestamp(timestampInput);
  const lastPrintAt = normalizeTimestamp(lastPrintInput);
  return {
    timestamp,
    lastPrintAt,
    freshness: timestamp === undefined ? undefined : relativeTime(timestamp),
  };
}

function normalizeBreaker(source) {
  const breaker = objectOrEmpty(firstValue(source, ["breaker", "circuitBreaker", "circuit_breaker"]));
  const frozen = firstValue(breaker, ["frozen"]) ?? (source?.status === "frozen" ? true : undefined);
  const explicitStatus = firstValue(breaker, ["status", "state"]) ?? firstValue(source, ["circuitBreakerStatus", "circuit_breaker_status"]);
  const status = isAvailable(explicitStatus) ? explicitStatus : frozen === true ? "FROZEN" : undefined;
  const threshold = firstValue(breaker, ["threshold", "thresholdPct", "threshold_pct"]) ?? firstValue(source, ["threshold", "thresholdPct", "threshold_pct"]);
  const thresholdPct = firstValue(breaker, ["thresholdPct", "threshold_pct"]) ?? firstValue(source, ["thresholdPct", "threshold_pct"]);
  const deviation = firstValue(breaker, ["deviation", "currentDeviation", "current_deviation"]) ?? firstValue(source, ["deviation", "currentDeviation", "current_deviation"]);
  return {
    status,
    frozen,
    frozenPrice: firstValue(breaker, ["frozenPrice", "frozen_price"]) ?? (frozen === true ? source?.price : undefined),
    frozenAt: normalizeTimestamp(firstValue(breaker, ["frozenAt", "frozen_at"]) ?? firstValue(source, ["frozenAt", "frozen_at"])),
    reason: firstValue(breaker, ["reason", "breakerReason", "breaker_reason"]) ?? firstValue(source, ["breakerReason", "breaker_reason"]),
    consecutiveOk: firstValue(breaker, ["consecutiveOk", "consecutive_ok"]) ?? firstValue(source, ["consecutiveOk", "consecutive_ok"]),
    threshold,
    thresholdPct,
    deviation,
    releaseTicks: firstValue(breaker, ["releaseTicks", "release_ticks"]) ?? firstValue(source, ["releaseTicks", "release_ticks"]),
  };
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return undefined;
  return value.map((point) => {
    if (typeof point === "number") return { price: point, ema: undefined, timestamp: undefined };
    const source = objectOrEmpty(point);
    return {
      price: firstValue(source, ["price", "value", "indexPrice"]),
      ema: firstValue(source, ["ema", "EMA"]),
      timestamp: normalizeTimestamp(firstValue(source, ["timestamp", "time", "at"])),
    };
  }).filter((point) => isAvailable(point.price));
}

function normalizeHip3(source) {
  const hip3 = objectOrEmpty(source?.hip3);
  const hasData = Object.keys(hip3).length > 0 || isAvailable(source?.hip3Status);
  if (!hasData) return undefined;
  return {
    enabled: firstValue(hip3, ["enabled"]),
    dryRun: firstValue(hip3, ["dryRun", "dry_run"]),
    isTestnet: firstValue(hip3, ["isTestnet", "is_testnet"]),
    market: firstValue(hip3, ["market"]) ?? firstValue(source, ["hip3Market", "hip_3_market"]),
    status: firstValue(hip3, ["status", "state"]) ?? firstValue(source, ["hip3Status", "hip_3_status"]),
    publishing: firstValue(hip3, ["publishing"]),
    publishIntervalMs: firstValue(hip3, ["publishIntervalMs", "publish_interval_ms"]),
    publishCount: firstValue(hip3, ["publishCount", "publish_count"]),
    lastPublishAt: normalizeTimestamp(firstValue(hip3, ["lastPublishAt", "last_publish_at"])),
    lastPublishedPx: firstValue(hip3, ["lastPublishedPx", "last_published_px"]),
    consecutiveFailures: firstValue(hip3, ["consecutiveFailures", "consecutive_failures"]),
    lastError: firstValue(hip3, ["lastError", "last_error"]),
    staleSkips: firstValue(hip3, ["staleSkips", "stale_skips"]),
    skippingStale: firstValue(hip3, ["skippingStale", "skipping_stale"]),
  };
}

export function normalizeOracle(payload) {
  const source = unwrapPayload(payload, ["oracle", "price"]);
  const raw = objectOrEmpty(source.raw);
  const timestamps = normalizeTimestampFields(source);
  const directCcl = firstValue(source, ["ccl", "CCL"]);
  return {
    symbol: firstValue(source, ["symbol", "ticker", "asset"]),
    price: firstValue(source, ["price", "oraclePrice", "publishedPrice"]),
    ema: firstValue(source, ["ema", "EMA"]),
    lastPrint: firstValue(source, ["lastPrint", "last_print", "last"]),
    bid: firstValue(source, ["bid"]),
    ask: firstValue(source, ["ask"]),
    spread: firstValue(source, ["spread"]),
    spreadPct: firstValue(source, ["spreadPct", "spread_pct"]),
    bookStale: firstValue(source, ["bookStale", "book_stale"]),
    pctChange: firstValue(source, ["pctChange", "pct_change"]),
    localPriceArs: firstValue(source, ["localPriceArs", "local_price_ars"]),
    adrRatio: firstValue(source, ["adrRatio", "adr_ratio"]),
    // CCL policy: only an explicit ccl/CCL field becomes `ccl`; reportedCcl stays separate.
    ccl: directCcl,
    reportedCcl: firstValue(source, ["reportedCcl", "reported_ccl"]),
    impliedCcl: firstValue(source, ["impliedCcl", "implied_ccl"]),
    cclSampled: firstValue(source, ["cclSampled", "ccl_sampled"]),
    cclDeviation: firstValue(source, ["cclDeviation", "ccl_deviation"]),
    crossCheck: firstValue(source, ["crossCheckStatus", "cross_check_status", "cclStatus"]) ?? (typeof source.crossCheck === "string" ? source.crossCheck : firstValue(objectOrEmpty(source.crossCheck), ["status", "result", "value"])),
    deviation: firstValue(source, ["deviation", "currentDeviation", "current_deviation"]),
    breakerReason: firstValue(source, ["breakerReason", "breaker_reason"]),
    frozenAt: normalizeTimestamp(firstValue(source, ["frozenAt", "frozen_at"])),
    ...timestamps,
    status: firstValue(source, ["status", "oracleStatus"]),
    source: firstValue(source, ["source", "dataSource"]),
    simulated: firstValue(source, ["simulated"]),
    marketOpen: firstValue(source, ["marketOpen", "market_open"]),
    data912Status: firstValue(source, ["data912Status", "data912_status", "sourceStatus", "source_status"]) ?? firstValue(raw, ["data912Status", "sourceStatus"]),
    normalizerStatus: firstValue(source, ["normalizerStatus", "normalizer_status", "normalizationStatus", "normalization_status"]) ?? firstValue(raw, ["normalizerStatus", "normalizationStatus"]),
    normalizationDetail: firstValue(source, ["normalizationDetail", "normalization_detail"]) ?? firstValue(raw, ["normalizationDetail"]),
    circuitBreaker: normalizeBreaker(source),
  };
}

export function normalizeMarket(payload) {
  const source = unwrapPayload(payload, ["market", "perp", "instrument"]);
  const hip3 = normalizeHip3(source);
  const history = normalizeHistory(firstValue(source, ["history", "series", "candles"]));
  return {
    symbol: firstValue(source, ["symbol", "ticker", "asset"]),
    markPrice: firstValue(source, ["markPrice", "mark_price", "mark"]),
    indexPrice: firstValue(source, ["indexPrice", "index_price", "index"]),
    fundingRate: firstValue(source, ["fundingRate", "funding_rate", "funding"]),
    maxLeverage: firstValue(source, ["maxLeverage", "max_leverage", "leverage"]),
    marketStatus: firstValue(source, ["marketStatus", "market_status", "status"]),
    hip3,
    oracleStatus: firstValue(source, ["oracleStatus", "oracle_status"]),
    oracleSource: firstValue(source, ["oracleSource", "oracle_source"]),
    simulated: firstValue(source, ["simulated"]),
    lastPushTx: firstValue(source, ["lastPushTx", "last_push_tx"]),
    lastPushAt: normalizeTimestamp(firstValue(source, ["lastPushAt", "last_push_at"])),
    volume24h: firstValue(source, ["volume24h", "volume_24h", "24hVolume", "volume"]),
    openInterest: firstValue(source, ["openInterest", "open_interest", "oi"]),
    change24h: firstValue(source, ["change24h", "change_24h", "percentChange", "percent_change", "pctChange"]),
    history,
    hyperCoreStatus: firstValue(source, ["hyperCoreStatus", "hyper_core_status"]),
    hyperEvmStatus: firstValue(source, ["hyperEvmStatus", "hyper_evm_status", "hyperEVMStatus"]),
  };
}

function normalizeOracleHealth(source) {
  const oracle = objectOrEmpty(source?.oracle);
  return {
    symbol: firstValue(oracle, ["symbol", "ticker", "asset"]),
    status: firstValue(oracle, ["status", "state"]),
    source: firstValue(oracle, ["source", "dataSource"]),
    marketOpen: firstValue(oracle, ["marketOpen", "market_open"]),
    lastFetchOkAt: normalizeTimestamp(firstValue(oracle, ["lastFetchOkAt", "last_fetch_ok_at"])),
    consecutiveFailures: firstValue(oracle, ["consecutiveFailures", "consecutive_failures"]),
    pollIntervalMs: firstValue(oracle, ["pollIntervalMs", "poll_interval_ms"]),
    simulatedWalk: firstValue(oracle, ["simulatedWalk", "simulated_walk"]),
  };
}

function normalizeHealthBreaker(source) {
  const breaker = objectOrEmpty(source?.breaker);
  const frozen = firstValue(breaker, ["frozen"]);
  const explicitStatus = firstValue(breaker, ["status", "state"]);
  return {
    status: isAvailable(explicitStatus) ? explicitStatus : frozen === true ? "FROZEN" : undefined,
    frozen,
    frozenPrice: firstValue(breaker, ["frozenPrice", "frozen_price"]),
    frozenAt: normalizeTimestamp(firstValue(breaker, ["frozenAt", "frozen_at"])),
    reason: firstValue(breaker, ["reason", "breakerReason", "breaker_reason"]),
    consecutiveOk: firstValue(breaker, ["consecutiveOk", "consecutive_ok"]),
    thresholdPct: firstValue(breaker, ["thresholdPct", "threshold_pct"]),
    releaseTicks: firstValue(breaker, ["releaseTicks", "release_ticks"]),
  };
}

function normalizePusher(source) {
  const pusher = objectOrEmpty(source?.pusher);
  return {
    enabled: firstValue(pusher, ["enabled"]),
    contract: firstValue(pusher, ["contract"]),
    intervalMs: firstValue(pusher, ["intervalMs", "interval_ms"]),
    lastPushTx: firstValue(pusher, ["lastPushTx", "last_push_tx"]),
    lastPushAt: normalizeTimestamp(firstValue(pusher, ["lastPushAt", "last_push_at"])),
  };
}

export function normalizeHealth(payload) {
  const source = unwrapPayload(payload, ["health", "system"]);
  return {
    status: firstValue(source, ["status", "state"]),
    timestamp: normalizeTimestamp(firstValue(source, ["timestamp", "updatedAt", "updated_at"])),
    oracle: normalizeOracleHealth(source),
    breaker: normalizeHealthBreaker(source),
    hip3: normalizeHip3(source),
    pusher: normalizePusher(source),
  };
}
