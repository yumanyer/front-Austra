import { escapeHTML, formatPrice, isAvailable } from "../utils.js";
import { icon } from "./common.js";

function normalizePoints(points) {
  if (!Array.isArray(points)) return [];
  return points.map((point, index) => {
    if (typeof point === "number") return { price: point, ema: null, label: String(index + 1) };
    return {
      price: Number(point?.price ?? point?.value ?? point?.indexPrice),
      ema: isAvailable(point?.ema) ? Number(point.ema) : null,
      label: point?.timestamp ? new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : String(index + 1),
    };
  }).filter((point) => Number.isFinite(point.price));
}

function linePath(points, key, width, height, padding, min, max) {
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  return points.map((point, index) => {
    const x = padding.left + (index / Math.max(points.length - 1, 1)) * usableWidth;
    const y = padding.top + (1 - ((point[key] - min) / Math.max(max - min, 0.000001))) * usableHeight;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

export function renderPriceChart({ points = [] } = {}) {
  const normalized = normalizePoints(points);
  if (normalized.length < 2) {
    return `<div class="chart-empty" role="status">
      <div class="chart-empty__icon">${icon("chart")}</div>
      <p>Historical data unavailable. The chart is ready for a real Price / EMA series.</p>
    </div>`;
  }

  const width = 920;
  const height = 350;
  const padding = { top: 22, right: 58, bottom: 34, left: 12 };
  const prices = normalized.flatMap((point) => [point.price, point.ema].filter(Number.isFinite));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, max * 0.008 || 1);
  const chartMin = min - range * 0.12;
  const chartMax = max + range * 0.12;
  const pricePath = linePath(normalized, "price", width, height, padding, chartMin, chartMax);
  const emaPoints = normalized.filter((point) => Number.isFinite(point.ema));
  const emaPath = emaPoints.length > 1 ? linePath(emaPoints, "ema", width, height, padding, chartMin, chartMax) : "";
  const areaPath = `${pricePath} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
  const grid = [0, 1, 2, 3, 4].map((step) => {
    const y = padding.top + (step / 4) * (height - padding.top - padding.bottom);
    const value = chartMax - (step / 4) * (chartMax - chartMin);
    return `<line class="chart-gridline" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" /><text class="chart-axis-label" x="${width - padding.right + 10}" y="${y + 4}">${escapeHTML(formatPrice(value))}</text>`;
  }).join("");
  const labelIndexes = [0, Math.floor((normalized.length - 1) / 2), normalized.length - 1];
  const labels = [...new Set(labelIndexes)].map((index) => {
    const x = padding.left + (index / Math.max(normalized.length - 1, 1)) * (width - padding.left - padding.right);
    return `<text class="chart-axis-label" x="${x}" y="${height - 9}" text-anchor="middle">${escapeHTML(normalized[index].label)}</text>`;
  }).join("");

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price and EMA historical chart">
    <defs><linearGradient id="chart-area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#3FA9E0" stop-opacity="0.22" /><stop offset="100%" stop-color="#3FA9E0" stop-opacity="0" /></linearGradient></defs>
    ${grid}
    ${labels}
    <path class="chart-area" d="${areaPath}" />
    <path class="chart-line" d="${pricePath}" />
    ${emaPath ? `<path class="chart-line chart-line--ema" d="${emaPath}" />` : ""}
  </svg>`;
}
