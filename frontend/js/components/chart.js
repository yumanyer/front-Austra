function normalizePoints(points) {
  if (!Array.isArray(points)) return [];
  return points.map((point, index) => ({
    price: Number(typeof point === "number" ? point : point?.price ?? point?.value ?? point?.indexPrice),
    ema: typeof point === "object" && point !== null && Number.isFinite(Number(point.ema)) ? Number(point.ema) : null,
    label: typeof point === "object" && point?.timestamp ? new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : String(index + 1),
  })).filter((point) => Number.isFinite(point.price));
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

export function updatePriceChart(svg, emptyState, points = []) {
  if (!svg || !emptyState) return;
  const normalized = normalizePoints(points);
  if (normalized.length < 2) {
    svg.hidden = true;
    emptyState.hidden = false;
    return;
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
  const gridLines = svg.querySelectorAll("[data-grid-line]");
  const yLabels = svg.querySelectorAll("[data-y-label]");
  const xLabels = svg.querySelectorAll("[data-x-label]");

  gridLines.forEach((line, index) => {
    const y = padding.top + (index / 4) * (height - padding.top - padding.bottom);
    line.setAttribute("x1", padding.left);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - padding.right);
    line.setAttribute("y2", y);
  });
  yLabels.forEach((label, index) => {
    const y = padding.top + (index / 4) * (height - padding.top - padding.bottom);
    const value = chartMax - (index / 4) * (chartMax - chartMin);
    label.setAttribute("x", width - padding.right + 10);
    label.setAttribute("y", y + 4);
    label.textContent = `$${value.toFixed(2)}`;
  });
  const labelIndexes = [0, Math.floor((normalized.length - 1) / 2), normalized.length - 1];
  xLabels.forEach((label, index) => {
    const pointIndex = labelIndexes[index];
    const x = padding.left + (pointIndex / Math.max(normalized.length - 1, 1)) * (width - padding.left - padding.right);
    label.setAttribute("x", x);
    label.setAttribute("y", height - 9);
    label.textContent = normalized[pointIndex].label;
  });

  svg.querySelector("[data-chart-area]")?.setAttribute("d", areaPath);
  svg.querySelector("[data-chart-price]")?.setAttribute("d", pricePath);
  const emaElement = svg.querySelector("[data-chart-ema]");
  if (emaElement) {
    emaElement.hidden = !emaPath;
    emaElement.toggleAttribute("hidden", !emaPath);
    if (emaPath) emaElement.setAttribute("d", emaPath);
  }
  svg.hidden = false;
  svg.removeAttribute("hidden");
  emptyState.hidden = true;
  emptyState.setAttribute("hidden", "");
}
