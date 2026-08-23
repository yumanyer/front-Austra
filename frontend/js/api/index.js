import { DEMO_SNAPSHOT } from "../demo-data.js";
import { safeErrorMessage } from "../utils/format.js";
import { getConfig, isDemoMode } from "./config.js";
import { requestJson, ApiError } from "./client.js";
import { HEALTH, ORACLE_PRICE, MARKET } from "./endpoints.js";
import { normalizeHealth, normalizeMarket, normalizeOracle } from "./normalize.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureJsonObject(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError("invalid_payload", "Backend payload is not a JSON object");
  }
  return payload;
}

function normalizeDemoSnapshot() {
  const demo = clone(DEMO_SNAPSHOT);
  const oracleInput = { ...demo.oracle.data, ...(demo.oracle.data?.raw || {}) };
  const marketInput = { ...demo.market.data, ...(demo.market.data?.raw || {}) };
  return {
    mode: "simulated",
    health: { ...demo.health, data: normalizeHealth(demo.health.data) },
    oracle: { ...demo.oracle, data: { ...normalizeOracle(oracleInput), freshness: demo.oracle.data?.freshness } },
    market: { ...demo.market, data: normalizeMarket(marketInput) },
    fetchedAt: demo.fetchedAt,
  };
}

async function loadResource(path, normalizer, fallbackMessage) {
  try {
    const payload = ensureJsonObject(await requestJson(path));
    return { status: "success", data: normalizer(payload), error: null, errorCode: null };
  } catch (error) {
    return {
      status: "error",
      data: null,
      error: safeErrorMessage(error, fallbackMessage),
      errorCode: error?.code || "unknown",
    };
  }
}

export function getHealth() {
  return loadResource(HEALTH, normalizeHealth, "Backend health unavailable");
}

export function getOracle() {
  return loadResource(ORACLE_PRICE, normalizeOracle, "Oracle unavailable");
}

export function getMarket() {
  return loadResource(MARKET, normalizeMarket, "Market data unavailable");
}

export async function loadSnapshot() {
  if (isDemoMode()) return normalizeDemoSnapshot();

  const [health, oracle, market] = await Promise.all([getHealth(), getOracle(), getMarket()]);
  return {
    mode: "real",
    health,
    oracle,
    market,
    fetchedAt: new Date().toISOString(),
  };
}

export { getConfig, normalizeHealth, normalizeMarket, normalizeOracle, requestJson };
