import { escapeHTML, formatBoolean, formatPercent, formatPrice, isAvailable, modeBadge, normalizeStatus, readableStatus, statusBadge, valueOrDash } from "../utils.js";
import { emptyNotice, icon, pageHeader, sectionHeader } from "../components/common.js";

function sourceCard(title, eyebrow, body, chips, status) {
  return `<article class="source-card">
    <div class="source-card__top"><div class="source-card__icon">${icon(title === "Data source" ? "database" : title === "Reference" ? "chart" : "network")}</div>${statusBadge(status, { label: readableStatus(status) })}</div>
    <h2>${title}</h2><p>${eyebrow}</p>
    ${body ? `<p>${body}</p>` : ""}
    <div class="source-card__asset-list">${chips.map((chip) => `<span class="asset-chip">${escapeHTML(chip)}</span>`).join("")}</div>
  </article>`;
}

function pipelineStatus(label, value, fallback = "UNAVAILABLE") {
  const status = isAvailable(value) ? value : fallback;
  return statusBadge(status, { label: isAvailable(value) ? readableStatus(value) : "Unavailable" });
}

function renderPipeline(oracleResource) {
  const oracle = oracleResource.data || {};
  const raw = oracle.raw || {};
  const breaker = oracle.circuitBreaker || {};
  const steps = [
    { index: "01", name: "Data912", status: raw.data912Status || raw.sourceStatus, detail: oracle.source || "Source unavailable" },
    { index: "02", name: "Normalize", status: raw.normalizerStatus || raw.normalizationStatus, detail: raw.normalizationDetail || "Normalization status unavailable" },
    { index: "03", name: "CCL Cross-check", status: oracle.crossCheck, detail: oracle.ccl ? `CCL ${formatPrice(oracle.ccl)}` : "Cross-check unavailable" },
    { index: "04", name: "Circuit Breaker", status: breaker.status, detail: breaker.status ? readableStatus(breaker.status) : "Protection status unavailable" },
    { index: "05", name: "EMA", status: isAvailable(oracle.ema) ? "AVAILABLE" : undefined, detail: formatPrice(oracle.ema) },
    { index: "06", name: "Published Price", status: isAvailable(oracle.price) ? "AVAILABLE" : undefined, detail: formatPrice(oracle.price) },
  ];
  return `<section class="surface pipeline-panel" aria-labelledby="pipeline-title">
        ${sectionHeader("Oracle pipeline", "Each stage is rendered from the oracle payload", "", "pipeline-title")}
    <div class="pipeline">
${steps.map((step) => `<article class="pipeline-step">
      <span class="pipeline-step__index">${step.index}</span>
      <strong class="pipeline-step__name">${step.name}</strong>
      <span class="pipeline-step__status">${pipelineStatus(step.name, step.status)}</span>
      <span class="pipeline-step__timestamp">${escapeHTML(step.detail)}</span>
    </article>`).join("")}</div>
  </section>`;
}

function renderMetrics(oracle) {
  const rows = [
    ["Last Print", valueOrDash(oracle.lastPrint, formatPrice)],
    ["EMA", valueOrDash(oracle.ema, formatPrice)],
    ["Bid", valueOrDash(oracle.bid, formatPrice)],
    ["Ask", valueOrDash(oracle.ask, formatPrice)],
    ["Spread", valueOrDash(oracle.spread, formatPrice)],
    ["CCL", valueOrDash(oracle.ccl, formatPrice)],
    ["Implied CCL", valueOrDash(oracle.impliedCcl, formatPrice)],
    ["Market Open", formatBoolean(oracle.marketOpen)],
    ["Source", valueOrDash(oracle.source)],
    ["Freshness", valueOrDash(oracle.freshness)],
    ["Status", readableStatus(normalizeStatus(oracle.status))],
  ];
  return `<section class="surface" aria-labelledby="oracle-metrics-title">
        ${sectionHeader("Oracle metrics", "Reference values available from the pricing service", "", "oracle-metrics-title")}
    <div class="metrics-list">
${rows.map(([label, value]) => `<div class="metrics-list__row"><span class="metrics-list__label">${escapeHTML(label)}</span><span class="metrics-list__value${value !== "—" ? " metrics-list__value--strong" : ""}">${escapeHTML(value)}</span></div>`).join("")}</div>
  </section>`;
}

function renderCircuitBreaker(oracle) {
  const breaker = oracle.circuitBreaker || {};
  const status = normalizeStatus(breaker.status);
  const frozen = status === "FROZEN";
  const threshold = valueOrDash(breaker.threshold, formatPercent);
  const deviation = valueOrDash(breaker.deviation, formatPercent);
  const ticks = valueOrDash(breaker.releaseTicks);
  return `<section class="surface" aria-labelledby="breaker-title">
    ${sectionHeader("Circuit breaker", "A protection mechanism, not an error state", "", "breaker-title")}
    <div class="surface__body circuit-panel__body">
      <div class="circuit-state"><div class="circuit-state__icon${frozen ? " circuit-state__icon--frozen" : ""}">${icon(frozen ? "shield" : status === "UNAVAILABLE" ? "warning" : "check")}</div><div><h2 class="circuit-state__title">${escapeHTML(readableStatus(status))}</h2><p class="circuit-state__description">${frozen ? "Price protected by circuit breaker." : status === "UNAVAILABLE" ? "Protection state unavailable." : "Circuit breaker state received from backend."}</p></div></div>
      <div class="circuit-bars">
        <div class="circuit-bar"><div class="circuit-bar__head"><span>Threshold</span><strong>${threshold}</strong></div><div class="circuit-bar__track"><div class="circuit-bar__fill" style="width:${isAvailable(breaker.threshold) ? Math.min(Math.max(Number(breaker.threshold), 0), 100) : 0}%"></div></div></div>
        <div class="circuit-bar"><div class="circuit-bar__head"><span>Current deviation</span><strong>${deviation}</strong></div><div class="circuit-bar__track"><div class="circuit-bar__fill circuit-bar__fill--green" style="width:${isAvailable(breaker.deviation) ? Math.min(Math.max(Number(breaker.deviation) * 5, 0), 100) : 0}%"></div></div></div>
        <div class="circuit-bar"><div class="circuit-bar__head"><span>Release ticks</span><strong>${ticks}</strong></div><div class="circuit-bar__track"><div class="circuit-bar__fill circuit-bar__fill--green" style="width:${isAvailable(breaker.releaseTicks) ? 100 : 0}%"></div></div></div>
      </div>
    </div>
  </section>`;
}

function renderEma(oracle) {
  return `<section class="ema-card" aria-labelledby="ema-title"><div class="ema-card__icon">${icon("chart")}</div><div><h2 id="ema-title">EMA</h2><p>Exponential Moving Average. Used as a stability reference for the circuit breaker and as fallback outside market hours.</p></div><span class="ema-card__value">${formatPrice(oracle.ema)}</span></section>`;
}

export function renderOracle(state) {
  const resource = state.snapshot.oracle;
  const oracle = resource.data || {};
  const demoMode = state.snapshot.mode === "simulated";
  const hasReal = resource.status === "success" && isAvailable(oracle.price);
  const health = resource.status === "success" ? oracle.status : "UNAVAILABLE";
  return `<div class="page container">
    ${pageHeader({ eyebrow: "ORACLE / PRICE ENGINE", title: "Price you can", accent: "audit", description: "A visual view of how AustralFinance obtains, validates and publishes a reference price for YPF.", meta: `${modeBadge(hasReal, demoMode)} ${statusBadge(health, { label: resource.status === "success" ? readableStatus(health) : "Unavailable", pulse: hasReal })}` })}
    ${resource.status === "error" ? emptyNotice("Oracle unavailable. The configured backend did not return a readable pricing payload.", "error") : ""}
    <div class="data-sources">
      ${sourceCard("Data source", "Primary price input", "Source identity is displayed only when returned by the backend.", [oracle.source || "Data912", "YPF ADR", "YPFD BYMA"], resource.status === "success" && oracle.source ? "CONNECTED" : "UNAVAILABLE")}
      ${sourceCard("Assets", "Validation scope", "Argentine asset references used by the oracle pipeline.", ["YPF ADR", "YPFD BYMA"], resource.status === "success" ? "AVAILABLE" : "UNAVAILABLE")}
      ${sourceCard("Reference", "Cross-check", "CCL is shown as a reference only when the service provides it.", ["CCL", "Implied CCL"], isAvailable(oracle.ccl) ? "PASS" : "UNAVAILABLE")}
    </div>
    ${renderPipeline(resource)}
    <div class="oracle-grid"><div class="oracle-stack">${renderMetrics(oracle)}${renderEma(oracle)}</div><div class="oracle-stack">${renderCircuitBreaker(oracle)}<div class="notice">${icon("info")}<span>Index Price is the oracle reference. Mark Price belongs to the perpetual market mechanism and is intentionally displayed separately on Market.</span></div></div></div>
  </div>`;
}
