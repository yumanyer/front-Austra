import { renderPriceChart } from "../js/components/chart.js";
import { emptyNotice, icon } from "../js/components/common.js";
import { loadPageSnapshot } from "../js/state.js";
import { formatPercent, formatPrice, isAvailable, modeBadge, readableStatus, statusBadge, valueOrDash } from "../js/utils/format.js";
import { showToast, wireGlobalUI } from "../js/app.js";

const page = document.querySelector('[data-page="market"]');

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

function setMetric(key, value, formatter) {
  const element = page?.querySelector(`[data-market-metric="${key}"]`);
  if (!element) return;
  const formatted = valueOrDash(value, formatter);
  element.textContent = formatted;
  element.classList.toggle("metric-value--muted", formatted === "—");
  element.classList.toggle("metrics-list__value--strong", formatted !== "—");
}

function resourceStatus(resource, fallbackLabel = "Unavailable") {
  if (resource?.status === "success") return resource.data?.status || "CONNECTED";
  return fallbackLabel;
}

function renderSystem(snapshot) {
  const demoMode = snapshot.mode === "simulated";
  const healthResource = snapshot.health;
  const healthStatus = healthResource.status === "success" ? healthResource.data?.status : "UNAVAILABLE";
  setHTML("[data-system-status]", demoMode ? modeBadge(true, true) : statusBadge(healthStatus, { label: readableStatus(healthStatus), pulse: healthStatus === "CONNECTED" }));
  setText("[data-system-note]", demoMode ? "Hardcoded visual fixture · no backend request" : snapshot.lastRefresh ? `Last refresh ${new Date(snapshot.lastRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No backend snapshot");
  setText("[data-updated]", snapshot.fetchedAt ? `updated ${new Date(snapshot.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "");
}

function renderNotices(snapshot) {
  const notices = [];
  if (snapshot.market.status === "error") notices.push(emptyNotice("Market data unavailable. Check the configured backend URL.", "error"));
  if (snapshot.oracle.status === "error") notices.push(emptyNotice("Oracle unavailable. Price and oracle metrics remain empty.", "error"));
  const notice = page?.querySelector("[data-market-notices]");
  if (!notice) return;
  notice.innerHTML = notices.join("");
  notice.hidden = notices.length === 0;
}

function renderMarket(snapshot) {
  const demoMode = snapshot.mode === "simulated";
  const marketResource = snapshot.market;
  const oracleResource = snapshot.oracle;
  const market = marketResource.data || {};
  const oracle = oracleResource.data || {};
  const hasPrice = oracleResource.status === "success" && isAvailable(oracle.price);
  const marketStatus = resourceStatus(marketResource, "UNAVAILABLE");
  const change = valueOrDash(market.change24h, formatPercent);
  const changeElement = setText("[data-change-value]", change);
  changeElement?.classList.toggle("change-readout__value--down", change.startsWith("-"));

  renderSystem(snapshot);
  renderNotices(snapshot);
  setHTML("[data-page-mode]", modeBadge(oracleResource.status === "success" || marketResource.status === "success", demoMode));
  setHTML("[data-market-status]", statusBadge(marketStatus, { label: marketStatus === "UNAVAILABLE" ? "Market unavailable" : readableStatus(marketStatus), pulse: marketStatus === "LIVE" }));
  setHTML("[data-market-mode]", modeBadge(hasPrice, demoMode));
  setText("[data-price-readout]", hasPrice ? formatPrice(oracle.price) : "—");
  const priceReadout = page?.querySelector("[data-price-readout]");
  if (priceReadout && !priceReadout.querySelector(".price-unit")) priceReadout.insertAdjacentHTML("beforeend", '<span class="price-unit">USD</span>');
  setText("[data-market-source]", hasPrice ? `Oracle reference · ${oracle.source || "Source unavailable"}` : "Oracle price unavailable. No value is simulated.");

  setMetric("indexPrice", market.indexPrice, formatPrice);
  setMetric("markPrice", market.markPrice, formatPrice);
  setMetric("volume24h", market.volume24h, formatPrice);
  setMetric("openInterest", market.openInterest, formatPrice);
  setMetric("fundingRate", market.fundingRate, formatPercent);
  setMetric("maxLeverage", market.maxLeverage, (value) => `${value}x`);

  const points = market.raw?.history || market.raw?.series || market.raw?.candles || [];
  const chart = page?.querySelector("[data-chart]");
  if (chart) chart.innerHTML = renderPriceChart({ points });
  setText("[data-chart-footnote]", `Historical source: ${demoMode ? "DEMO DATA · simulated series" : points.length > 1 ? "backend series" : "not configured"}. ${demoMode ? "This chart is for visual review only." : "Only real series will be rendered."}`);

  const summaryReal = oracleResource.status === "success" && isAvailable(oracle.price);
  setHTML("[data-oracle-summary-status]", statusBadge(oracleResource.status === "success" ? oracle.status : "UNAVAILABLE", { label: oracleResource.status === "success" ? readableStatus(oracle.status) : "Unavailable", pulse: summaryReal }));
  setHTML("[data-oracle-summary-mode]", modeBadge(summaryReal, demoMode));
  setText("[data-oracle-freshness]", oracle.freshness ? `Freshness ${oracle.freshness}` : "Freshness —");
  setText('[data-oracle-summary="source"]', valueOrDash(oracle.source));
  setText('[data-oracle-summary="ema"]', formatPrice(oracle.ema));
  setText('[data-oracle-summary="breaker"]', valueOrDash(oracle.circuitBreaker?.status));
  const summaryNotice = page?.querySelector("[data-oracle-summary-notice]");
  if (summaryNotice) {
    summaryNotice.innerHTML = oracleResource.status === "error" ? emptyNotice("Oracle unavailable. The endpoint did not return a readable payload.", "error") : "";
    summaryNotice.hidden = oracleResource.status !== "error";
  }
}

function bindMarketInteractions() {
  page?.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      page.querySelectorAll("[data-period]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
    });
  });
}

wireGlobalUI(document);
bindMarketInteractions();
loadPageSnapshot().then(renderMarket).catch(() => showToast("Unable to prepare the demo snapshot."));
