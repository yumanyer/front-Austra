import { MOCK_SNAPSHOT } from "./mock-data.js";
import { formatNumber, formatPercent, formatPrice, isAvailable, normalizeStatus, readableStatus, statusTone } from "./utils.js";

export function loadMockSnapshot() {
  return JSON.parse(JSON.stringify(MOCK_SNAPSHOT));
}

export function setText(selectorOrElement, value, root = document) {
  const element = typeof selectorOrElement === "string" ? root.querySelector(selectorOrElement) : selectorOrElement;
  if (element) element.textContent = value;
  return element;
}

export function setHidden(selectorOrElement, hidden, root = document) {
  const element = typeof selectorOrElement === "string" ? root.querySelector(selectorOrElement) : selectorOrElement;
  if (element) {
    element.hidden = Boolean(hidden);
    element.toggleAttribute("hidden", Boolean(hidden));
  }
  return element;
}

export function setStatus(element, value, { label, pulse = false } = {}) {
  if (!element) return;
  const status = normalizeStatus(value);
  element.classList.remove("status-badge--positive", "status-badge--active", "status-badge--warning", "status-badge--negative", "status-badge--neutral");
  element.classList.add(`status-badge--${statusTone(status)}`);
  const labelElement = element.querySelector("[data-status-label], [data-sync-label]");
  if (labelElement) labelElement.textContent = label || readableStatus(status);
  const dot = element.querySelector(".status-dot");
  if (dot) dot.classList.toggle("status-dot--pulse", pulse);
}

export function setMode(element, isReady, isMock = true) {
  if (!element) return;
  element.classList.remove("data-mode--real", "data-mode--demo", "data-mode--unavailable");
  element.classList.add(isMock ? "data-mode--demo" : isReady ? "data-mode--real" : "data-mode--unavailable");
  element.textContent = isMock ? "MOCK DATA" : isReady ? "READY" : "UNAVAILABLE";
}

export function formatField(value, formatter = String) {
  return isAvailable(value) ? formatter(value) : "—";
}

export function formatFreshness(value) {
  return isAvailable(value) ? `Freshness ${String(value)}` : "Freshness —";
}

export function formatUpdated(value) {
  if (!isAvailable(value)) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : `updated ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatMetric(value, kind = "price") {
  if (kind === "percent") return formatField(value, formatPercent);
  if (kind === "number") return formatField(value, (item) => formatNumber(item));
  if (kind === "leverage") return formatField(value, (item) => `${item}x`);
  return formatField(value, formatPrice);
}

export function updateSystemStrip({ label = "MOCK DATA", note = "Frontend preview · no integrations connected", status = "READY" } = {}) {
  const strip = document.querySelector("[data-sync-strip]");
  if (!strip) return;
  setStatus(strip.querySelector("[data-sync-badge]"), status, { label, pulse: status === "READY" });
  setText(strip.querySelector("[data-sync-note]"), note);
}

export function bindPeriodButtons(root = document) {
  root.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-period]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      setText(root.querySelector("[data-chart-footnote]"), `Showing mock ${button.dataset.period} series · visual preview only`);
    });
  });
}
