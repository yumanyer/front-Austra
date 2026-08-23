export function normalizeTimestamp(value) {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? undefined : time;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) < 1e12 ? value * 1000 : value;
  }

  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

export function toDate(value) {
  const timestamp = normalizeTimestamp(value);
  return timestamp === undefined ? undefined : new Date(timestamp);
}

export function formatTimestamp(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
}

export function relativeTime(value, now = Date.now()) {
  const timestamp = normalizeTimestamp(value);
  if (timestamp === undefined) return "—";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}
