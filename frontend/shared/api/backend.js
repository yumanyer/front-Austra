import { firstValue, isAvailable, valueOrDash, formatPrice, formatPercent, formatBoolean } from "../shared/utils/format.js"

const DEFAULT_TIMEOUT = 4500
const API_BASE = "/api"

function unwrapPayload(payload, keys = []) {
  if (!payload || typeof payload !== "object") return {}
  for (const key of keys) {
    if (payload[key] && typeof payload[key] === "object") return payload[key]
  }
  if (payload.data && typeof payload.data === "object") return payload.data
  return payload
}

function safeErrorMessage(error, fallbackMessage) {
  if (error?.name === "AbortError") return "Request timed out"
  return error?.message || fallbackMessage
}

export async function requestJson(path, options = {}) {
  const controller = new AbortController()
  const timeout = options.timeout || DEFAULT_TIMEOUT
  const timer = window.setTimeout(() => controller.abort(), timeout)
  const url = `${API_BASE}${path}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    window.clearTimeout(timer)
  }
}

export async function loadHealth() {
  return requestJson("/health")
}

export async function loadOraclePrice(symbol = "YPF") {
  return requestJson(`/oracle/price/${symbol}`)
}

export async function loadMarket(symbol = "YPF-PERP") {
  return requestJson(`/market/${symbol}`)
}

export async function loadInfrastructure() {
  return requestJson("/infrastructure")
}

export function normalizeOracle(payload) {
  const source = unwrapPayload(payload, ["oracle", "price"])
  const crossCheck = unwrapPayload(source, ["crossCheck", "cross_check", "cclCheck"])
  const breaker = unwrapPayload(source, ["circuitBreaker", "circuit_breaker", "breaker"])
  return {
    price: firstValue(source, ["price", "oraclePrice", "publishedPrice"]),
    ema: firstValue(source, ["ema", "EMA"]),
    lastPrint: firstValue(source, ["lastPrint", "last_print", "last"]),
    bid: firstValue(source, ["bid"]),
    ask: firstValue(source, ["ask"]),
    spread: firstValue(source, ["spread"]),
    ccl: firstValue(source, ["ccl", "CCL", "crossCheckCcl", "cross_check_ccl"]) ?? firstValue(crossCheck, ["ccl", "value", "price"]),
    impliedCcl: firstValue(source, ["impliedCcl", "implied_ccl"]) ?? firstValue(crossCheck, ["impliedCcl", "implied_ccl"]),
    crossCheck: firstValue(source, ["crossCheckStatus", "cross_check_status", "cclStatus"]) ?? firstValue(crossCheck, ["status", "result"]),
    status: firstValue(source, ["status", "oracleStatus"]),
    source: firstValue(source, ["source", "dataSource"]),
    marketOpen: firstValue(source, ["marketOpen", "market_open"]),
    freshness: firstValue(source, ["freshness", "updatedAt", "updated_at", "timestamp", "lastUpdated"]),
    circuitBreaker: {
      status: firstValue(breaker, ["status", "state"]) ?? firstValue(source, ["circuitBreakerStatus", "circuit_breaker_status"]),
      threshold: firstValue(breaker, ["threshold", "thresholdPct", "threshold_pct"]),
      deviation: firstValue(breaker, ["deviation", "currentDeviation", "current_deviation"]),
      releaseTicks: firstValue(breaker, ["releaseTicks", "release_ticks"]),
    },
    raw: source,
  }
}

export function normalizeMarket(payload) {
  const source = unwrapPayload(payload, ["market", "perp", "instrument"])
  return {
    markPrice: firstValue(source, ["markPrice", "mark_price", "mark"]),
    indexPrice: firstValue(source, ["indexPrice", "index_price", "index"]),
    fundingRate: firstValue(source, ["fundingRate", "funding_rate", "funding"]),
    maxLeverage: firstValue(source, ["maxLeverage", "max_leverage", "leverage"]),
    marketStatus: firstValue(source, ["marketStatus", "market_status", "status"]),
    hip3Status: firstValue(source, ["hip3Status", "hip_3_status", "hip3"]),
    pusherStatus: firstValue(source, ["pusherStatus", "pusher_status", "pusher"]),
    volume24h: firstValue(source, ["volume24h", "volume_24h", "24hVolume", "volume"]),
    openInterest: firstValue(source, ["openInterest", "open_interest", "oi"]),
    change24h: firstValue(source, ["change24h", "change_24h", "percentChange", "percent_change"]),
    history: firstValue(source, ["history", "series", "candles"]),
    raw: source,
  }
}

export function normalizeHealth(payload) {
  const source = unwrapPayload(payload, ["health", "system"])
  return {
    status: firstValue(source, ["status", "state"]) || (isAvailable(payload) ? "CONNECTED" : undefined),
    version: firstValue(source, ["version", "build"]),
    raw: source,
  }
}