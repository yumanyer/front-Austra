import { formatField, formatMetric, formatUpdated, loadMockSnapshot, setHidden, setMode, setStatus, setText, updateSystemStrip } from "../js/page-data.js";
import { formatBoolean, isAvailable, normalizeStatus, readableStatus } from "../js/utils/index.js";

const root = document.querySelector(".oracle-page");
const snapshot = loadMockSnapshot();
const oracleResource = snapshot.oracle;
const oracle = oracleResource.data;
const breaker = oracle.circuitBreaker;
const raw = oracle.raw;

function updatePipeline() {
  const stages = {
    data: { status: raw.sourceStatus, detail: oracle.source },
    normalize: { status: raw.normalizerStatus, detail: raw.normalizationDetail },
    "cross-check": { status: oracle.crossCheck, detail: `CCL ${formatMetric(oracle.ccl)}` },
    breaker: { status: breaker.status, detail: readableStatus(breaker.status) },
    ema: { status: isAvailable(oracle.ema) ? "READY" : "UNAVAILABLE", detail: formatMetric(oracle.ema) },
    price: { status: isAvailable(oracle.price) ? "READY" : "UNAVAILABLE", detail: formatMetric(oracle.price) }
  };
  Object.entries(stages).forEach(([key, stage]) => {
    const statusElement = root.querySelector(`[data-pipeline-status="${key}"]`);
    setStatus(statusElement, stage.status, { label: readableStatus(stage.status), pulse: normalizeStatus(stage.status) === "READY" });
    setText(root.querySelector(`[data-pipeline-detail="${key}"]`), stage.detail || "Unavailable");
  });
}

function updateMetrics() {
  const fields = {
    lastPrint: formatMetric(oracle.lastPrint),
    ema: formatMetric(oracle.ema),
    bid: formatMetric(oracle.bid),
    ask: formatMetric(oracle.ask),
    spread: formatMetric(oracle.spread),
    ccl: formatMetric(oracle.ccl),
    impliedCcl: formatMetric(oracle.impliedCcl),
    marketOpen: formatBoolean(oracle.marketOpen),
    source: formatField(oracle.source),
    freshness: formatField(oracle.freshness),
    status: readableStatus(oracle.status)
  };
  Object.entries(fields).forEach(([key, value]) => setText(root.querySelector(`[data-oracle-field="${key}"]`), value));
  setText(root.querySelector("[data-ema-value]"), formatMetric(oracle.ema));
}

function updateBreaker() {
  const status = normalizeStatus(breaker.status);
  const frozen = status === "FROZEN";
  setText(root.querySelector("[data-breaker-status]"), readableStatus(status));
  setText(root.querySelector("[data-breaker-description]"), frozen ? "Price protected by circuit breaker." : "Circuit breaker state received from mock data.");
  const icon = root.querySelector("[data-breaker-icon]");
  icon?.classList.toggle("circuit-state__icon--frozen", frozen);
  setText(icon, frozen ? "!" : "✓");

  const values = { threshold: breaker.threshold, deviation: breaker.deviation, releaseTicks: breaker.releaseTicks };
  Object.entries(values).forEach(([key, value]) => setText(root.querySelector(`[data-breaker-field="${key}"]`), key === "threshold" || key === "deviation" ? formatMetric(value, "percent") : formatField(value)));
  const threshold = Math.min(Math.max(Number(breaker.threshold) || 0, 0), 100);
  const deviation = Math.min(Math.max(Number(breaker.deviation) * 5 || 0, 0), 100);
  setText(root.querySelector('[data-breaker-bar="threshold"]'), "");
  root.querySelector('[data-breaker-bar="threshold"]')?.style.setProperty("width", `${threshold}%`);
  root.querySelector('[data-breaker-bar="deviation"]')?.style.setProperty("width", `${deviation}%`);
  root.querySelector('[data-breaker-bar="releaseTicks"]')?.style.setProperty("width", "100%");
}

setMode(root.querySelector("[data-oracle-mode]"), true, true);
setStatus(root.querySelector("[data-oracle-header-status]"), oracle.status, { label: readableStatus(oracle.status), pulse: true });
setStatus(root.querySelector('[data-source-status="data"]'), "READY", { label: "Mock feed", pulse: true });
setStatus(root.querySelector('[data-source-status="assets"]'), "READY", { label: "Ready", pulse: true });
setStatus(root.querySelector('[data-source-status="reference"]'), oracle.crossCheck, { label: readableStatus(oracle.crossCheck), pulse: true });
setText(root.querySelector("[data-source-name]"), oracle.source);
updatePipeline();
updateMetrics();
updateBreaker();
setHidden(root.querySelector("[data-oracle-error]"), true);
updateSystemStrip();
