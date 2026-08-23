import { emptyNotice, icon } from "../js/components/common.js";
import { loadPageSnapshot } from "../js/state.js";
import { formatBoolean, formatPrice, formatRatioPercent, isAvailable, modeBadge, normalizeStatus, readableStatus, statusBadge, valueOrDash } from "../js/utils/format.js";
import { wireGlobalUI } from "../js/app.js";

const page = document.querySelector('[data-page="oracle"]');

function setHTML(selector, html) {
  const element = page?.querySelector(selector);
  if (element) element.innerHTML = html;
  return element;
}

function setText(selector, value) {
  const element = page?.querySelector(selector);
  if (element) element.textContent = value;
  return element;
}

function setDocumentHTML(selector, html) {
  const element = document.querySelector(selector);
  if (element) element.innerHTML = html;
  return element;
}

function setDocumentText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
  return element;
}

function renderStatus(selector, value, options = {}) {
  setHTML(selector, statusBadge(value, { label: isAvailable(value) ? readableStatus(value) : "Unavailable", ...options }));
}

function renderSystem(snapshot) {
  const demoMode = snapshot.mode === "simulated";
  const healthResource = snapshot.health;
  const healthStatus = healthResource.status === "success" ? healthResource.data?.status : "UNAVAILABLE";
  setDocumentHTML("[data-system-status]", demoMode ? modeBadge(true, true) : statusBadge(healthStatus, { label: readableStatus(healthStatus), pulse: healthStatus === "CONNECTED" }));
  const refreshedAt = snapshot.lastRefresh || snapshot.fetchedAt;
  setDocumentText("[data-system-note]", demoMode ? "Read-only preview" : refreshedAt ? `Last refresh ${new Date(refreshedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "");
  setDocumentText("[data-updated]", snapshot.fetchedAt ? `updated ${new Date(snapshot.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "");
}

function renderOracle(snapshot) {
  const resource = snapshot.oracle;
  const oracle = resource.data || {};
  const breaker = {
    ...(snapshot.health?.data?.breaker || {}),
    ...Object.fromEntries(Object.entries(oracle.circuitBreaker || {}).filter(([, value]) => isAvailable(value))),
  };
  const demoMode = snapshot.mode === "simulated";
  const hasReal = resource.status === "success" && isAvailable(oracle.price);
  const health = resource.status === "success" ? oracle.status : "UNAVAILABLE";
  const hasCcl = isAvailable(oracle.ccl) || isAvailable(oracle.reportedCcl) || isAvailable(oracle.impliedCcl);

  renderSystem(snapshot);
  setHTML("[data-page-mode]", modeBadge(hasReal, demoMode));
  renderStatus("[data-page-status]", health, { pulse: hasReal });
  const pageNotice = page?.querySelector("[data-oracle-notice]");
  if (pageNotice) {
    pageNotice.innerHTML = resource.status === "error" ? emptyNotice("Oracle unavailable. The configured backend did not return a readable pricing payload.", "error") : "";
    pageNotice.hidden = resource.status !== "error";
  }

  renderStatus('[data-source-status="data"]', resource.status === "success" && oracle.source ? "CONNECTED" : "UNAVAILABLE");
  renderStatus('[data-source-status="assets"]', resource.status === "success" && (isAvailable(oracle.symbol) || demoMode) ? "AVAILABLE" : "UNAVAILABLE");
  renderStatus('[data-source-status="reference"]', hasCcl ? "PASS" : "UNAVAILABLE");
  setText("[data-source-name]", oracle.source || (demoMode ? "Data912" : "Source unavailable"));

  const pipeline = [
    ["data", oracle.data912Status, oracle.source || "Source unavailable"],
    ["normalize", oracle.normalizerStatus, oracle.normalizationDetail || "Normalization status unavailable"],
    ["cross-check", oracle.crossCheck, (oracle.ccl ?? oracle.reportedCcl) !== undefined ? `CCL ${formatPrice(oracle.ccl ?? oracle.reportedCcl)}` : "Cross-check unavailable"],
    ["breaker", breaker.status, breaker.status ? readableStatus(breaker.status) : "Protection status unavailable"],
    ["ema", isAvailable(oracle.ema) ? "AVAILABLE" : undefined, formatPrice(oracle.ema)],
    ["price", isAvailable(oracle.price) ? "AVAILABLE" : undefined, formatPrice(oracle.price)],
  ];
  pipeline.forEach(([key, status, detail]) => {
    renderStatus(`[data-pipeline-status="${key}"]`, status);
    setText(`[data-pipeline-detail="${key}"]`, detail);
  });

  const metrics = {
    lastPrint: valueOrDash(oracle.lastPrint, formatPrice),
    ema: valueOrDash(oracle.ema, formatPrice),
    bid: valueOrDash(oracle.bid, formatPrice),
    ask: valueOrDash(oracle.ask, formatPrice),
    spread: valueOrDash(oracle.spread, formatPrice),
    // The UI's CCL row displays the reported reference when plain `ccl` is absent; the model keeps both fields distinct.
    ccl: valueOrDash(oracle.ccl ?? oracle.reportedCcl, formatPrice),
    impliedCcl: valueOrDash(oracle.impliedCcl, formatPrice),
    marketOpen: formatBoolean(oracle.marketOpen),
    source: valueOrDash(oracle.source),
    freshness: valueOrDash(oracle.freshness),
    status: readableStatus(normalizeStatus(oracle.status)),
  };
  Object.entries(metrics).forEach(([key, value]) => {
    const element = setText(`[data-oracle-metric="${key}"]`, value);
    element?.classList.toggle("metrics-list__value--strong", value !== "—");
  });
  setText("[data-ema-value]", formatPrice(oracle.ema));

  const breakerStatus = normalizeStatus(breaker.status);
  const frozen = breakerStatus === "FROZEN";
  const breakerIcon = page?.querySelector("[data-breaker-icon]");
  if (breakerIcon) {
    breakerIcon.classList.toggle("circuit-state__icon--frozen", frozen);
    breakerIcon.innerHTML = icon(frozen ? "shield" : breakerStatus === "UNAVAILABLE" ? "warning" : "check");
  }
  setText("[data-breaker-status]", readableStatus(breakerStatus));
  setText("[data-breaker-description]", frozen ? "Price protected by circuit breaker." : breakerStatus === "UNAVAILABLE" ? "Protection state unavailable." : "Circuit breaker state received from backend.");
  const thresholdRatio = breaker.thresholdPct ?? breaker.threshold;
  const threshold = valueOrDash(thresholdRatio, formatRatioPercent);
  const deviation = valueOrDash(breaker.deviation, formatRatioPercent);
  const releaseTicks = isAvailable(breaker.releaseTicks)
    ? `${isAvailable(breaker.consecutiveOk) ? breaker.consecutiveOk : "—"} / ${breaker.releaseTicks}`
    : "—";
  setText('[data-breaker-value="threshold"]', threshold);
  setText('[data-breaker-value="deviation"]', deviation);
  setText('[data-breaker-value="releaseTicks"]', releaseTicks);
  const widths = {
    threshold: isAvailable(thresholdRatio) ? Math.min(Math.max(Number(thresholdRatio) * 100, 0), 100) : 0,
    deviation: isAvailable(breaker.deviation) ? Math.min(Math.max(Number(breaker.deviation) * 500, 0), 100) : 0,
    releaseTicks: isAvailable(breaker.releaseTicks) && isAvailable(breaker.consecutiveOk) ? Math.min(Math.max((Number(breaker.consecutiveOk) / Number(breaker.releaseTicks)) * 100, 0), 100) : 0,
  };
  Object.entries(widths).forEach(([key, width]) => {
    const fill = page?.querySelector(`[data-breaker-fill="${key}"]`);
    if (fill) fill.style.width = `${width}%`;
  });
}

wireGlobalUI(document);
loadPageSnapshot().then(renderOracle);
