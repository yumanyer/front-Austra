import { formatTimestamp as formatTimestampValue, relativeTime as relativeTimeValue } from "./time.js";

export const UNAVAILABLE = "—";

export function isAvailable(value) {
  return value !== undefined && value !== null && value !== "";
}

export function valueOrDash(value, formatter = String) {
  return isAvailable(value) ? formatter(value) : UNAVAILABLE;
}

export function firstValue(source, keys) {
  if (!source || typeof source !== "object") return undefined;
  for (const key of keys) {
    const value = source[key];
    if (isAvailable(value)) return value;
  }
  return undefined;
}

export function formatPrice(value) {
  if (!isAvailable(value) || Number.isNaN(Number(value))) return UNAVAILABLE;
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(value))}`;
}

export function formatPercent(value) {
  if (!isAvailable(value) || Number.isNaN(Number(value))) return UNAVAILABLE;
  const number = Number(value);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2)}%`;
}

export function formatNumber(value, options = {}) {
  if (!isAvailable(value) || Number.isNaN(Number(value))) return UNAVAILABLE;
  return new Intl.NumberFormat("en-US", options).format(Number(value));
}

export function formatBoolean(value) {
  if (!isAvailable(value)) return UNAVAILABLE;
  return value === true || value === "true" ? "Yes" : "No";
}

export function formatTimestamp(value) {
  return isAvailable(value) ? formatTimestampValue(value) : UNAVAILABLE;
}

export function relativeTime(value) {
  return isAvailable(value) ? relativeTimeValue(value) : UNAVAILABLE;
}

export function normalizeStatus(value, fallback = "UNAVAILABLE") {
  if (!isAvailable(value)) return fallback;
  return String(value).trim().toUpperCase().replace(/[-\s]+/g, "_");
}

export function readableStatus(value) {
  const normalized = normalizeStatus(value);
  return normalized.replace(/_/g, " ");
}

export function statusTone(value) {
  const normalized = normalizeStatus(value);
  if (["LIVE", "VALID", "ACTIVE", "CONNECTED", "PASS", "CLEAR", "HEALTHY"].includes(normalized)) return "positive";
  if (["FROZEN", "STALE", "DEGRADED", "REHEARSAL", "EMA_FALLBACK", "TESTNET"].includes(normalized)) return "warning";
  if (["ERROR", "OFFLINE", "WRONG_NETWORK"].includes(normalized)) return "negative";
  if (["UNAVAILABLE", "NOT_CONFIGURED", "DISCONNECTED", "COMING_SOON", "SIMULATED"].includes(normalized)) return "neutral";
  return "active";
}

export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function statusBadge(value, options = {}) {
  const status = normalizeStatus(value, options.fallback || "UNAVAILABLE");
  const label = options.label || readableStatus(status);
  const tone = options.tone || statusTone(status);
  const pulse = options.pulse ? " status-dot--pulse" : "";
  return `<span class="status-badge status-badge--${tone}"><span class="status-dot${pulse}" aria-hidden="true"></span>${escapeHTML(label)}</span>`;
}

export function modeBadge(isReal, isDemo = false) {
  if (isDemo) return `<span class="data-mode data-mode--demo">DEMO DATA</span>`;
  return `<span class="data-mode ${isReal ? "data-mode--real" : "data-mode--unavailable"}">${isReal ? "REAL" : "UNAVAILABLE"}</span>`;
}

export function safeErrorMessage(error, fallback) {
  if (error?.name === "AbortError") return "Request timed out";
  return error?.message || fallback;
}
