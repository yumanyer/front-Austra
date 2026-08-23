export const UNAVAILABLE = "—"

export function isAvailable(value) {
  return value !== undefined && value !== null && value !== ""
}

export function valueOrDash(value, formatter = String) {
  return isAvailable(value) ? formatter(value) : UNAVAILABLE
}

export function firstValue(source, keys) {
  if (!source || typeof source !== "object") return undefined
  for (const key of keys) {
    const value = source[key]
    if (isAvailable(value)) return value
  }
  return undefined
}

export function formatPrice(value) {
  if (!isAvailable(value) || Number.isNaN(Number(value))) return UNAVAILABLE
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number(value))}`
}

export function formatPercent(value) {
  if (!isAvailable(value) || Number.isNaN(Number(value))) return UNAVAILABLE
  const number = Number(value)
  const sign = number > 0 ? "+" : ""
  return `${sign}${number.toFixed(2)}%`
}

export function formatNumber(value, options = {}) {
  if (!isAvailable(value) || Number.isNaN(Number(value))) return UNAVAILABLE
  return new Intl.NumberFormat("en-US", options).format(Number(value))
}

export function formatBoolean(value) {
  if (!isAvailable(value)) return UNAVAILABLE
  return value === true || value === "true" ? "Yes" : "No"
}

export function formatTimestamp(value) {
  if (!isAvailable(value)) return UNAVAILABLE
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date)
}

export function relativeTime(value) {
  if (!isAvailable(value)) return UNAVAILABLE
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.round(minutes / 60)}h ago`
}

export function normalizeStatus(value, fallback = "UNAVAILABLE") {
  if (!isAvailable(value)) return fallback
  return String(value).trim().toUpperCase().replace(/[-\s]+/g, "_")
}

export function readableStatus(value) {
  const normalized = normalizeStatus(value)
  return normalized.replace(/_/g, " ")
}

export function statusTone(value) {
  const normalized = normalizeStatus(value)
  if (["LIVE", "VALID", "ACTIVE", "CONNECTED", "PASS", "CLEAR", "HEALTHY"].includes(normalized)) return "positive"
  if (["FROZEN", "STALE", "DEGRADED", "REHEARSAL", "EMA_FALLBACK", "TESTNET"].includes(normalized)) return "warning"
  if (["ERROR", "OFFLINE", "WRONG_NETWORK"].includes(normalized)) return "negative"
  if (["UNAVAILABLE", "NOT_CONFIGURED", "DISCONNECTED", "COMING_SOON", "SIMULATED"].includes(normalized)) return "neutral"
  return "active"
}

export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """)
    .replaceAll("'", "&#039;")
}