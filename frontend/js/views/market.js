import { formatPercent, formatPrice, isAvailable, modeBadge, readableStatus, statusBadge, valueOrDash } from "../utils.js";
import { emptyNotice, icon, metricCard, pageHeader, priceWithLabel, sectionHeader } from "../components/common.js";
import { renderPriceChart } from "../components/chart.js";

function resourceStatus(resource, fallbackLabel = "Unavailable") {
  if (resource?.status === "success") return resource.data?.status || "CONNECTED";
  return fallbackLabel;
}

function renderMarketHeader(marketResource, oracleResource, demoMode = false) {
  const market = marketResource.data || {};
  const oracle = oracleResource.data || {};
  const hasPrice = oracleResource.status === "success" && isAvailable(oracle.price);
  const marketStatus = marketResource.status === "success" ? market.marketStatus : "UNAVAILABLE";
  const change = valueOrDash(market.change24h, formatPercent);
  const changeTone = change.startsWith("-") ? "change-readout__value change-readout__value--down" : "change-readout__value";

  return `<section class="surface market-hero" aria-labelledby="market-instrument-title">
    <div class="market-header">
      <div>
        <div class="market-identity">
          <h2 class="market-identity__name" id="market-instrument-title">YPF-PERP</h2>
          ${statusBadge(marketStatus, { label: marketStatus === "UNAVAILABLE" ? "Market unavailable" : readableStatus(marketStatus), pulse: marketStatus === "LIVE" })}
        </div>
        <div class="market-identity__meta"><strong>YPF</strong><span aria-hidden="true">·</span><span>BYMA: YPFD</span><span aria-hidden="true">·</span><span>HIP-3 DEX: arg</span></div>
        <div class="market-header__price">
          <p class="price-readout" data-price-readout>${hasPrice ? formatPrice(oracle.price) : "—"}<span class="price-unit">USD</span></p>
          <div class="change-readout"><span class="${changeTone}">${change}</span><span class="change-readout__label">24h change</span></div>
        </div>
      </div>
      <div class="market-header__side">
        ${modeBadge(hasPrice, demoMode)}
        <p class="market-header__side-note">${hasPrice ? `Oracle reference · ${oracle.source || "Source unavailable"}` : "Oracle price unavailable. No value is simulated."}</p>
      </div>
    </div>

  </section>`;
}

function renderChartPanel(market, demoMode = false) {
  const points = market?.raw?.history || market?.raw?.series || market?.raw?.candles || [];
  return `<section class="surface chart-panel" aria-labelledby="price-chart-title">
    <div class="chart-toolbar">
      <div class="chart-toolbar__title"><div>${icon("chart")}</div><div><h2 id="price-chart-title">Price history</h2><div class="chart-legend"><span class="legend-item"><i class="legend-line"></i>Price</span><span class="legend-item"><i class="legend-line legend-line--ema"></i>EMA</span></div></div></div>
      <div class="chart-periods" role="group" aria-label="Chart period">
        <button class="chart-period is-active" type="button" data-period="1H">1H</button>
        <button class="chart-period" type="button" data-period="1D">1D</button>
        <button class="chart-period" type="button" data-period="1W">1W</button>
      </div>
    </div>
    <div class="chart-wrap">${renderPriceChart({ points })}</div>
    <p class="chart-footnote">Historical source: ${demoMode ? "DEMO DATA · simulated series" : points.length > 1 ? "backend series" : "not configured"}. ${demoMode ? "This chart is for visual review only." : "Only real series will be rendered."}</p>
  </section>`;
}


function renderMetrics(market) {
  return `<section class="surface metrics-panel" aria-labelledby="metrics-title">
    ${sectionHeader("Market metrics", "Values are read from the market endpoint", "", "metrics-title")}
    <div class="metric-grid">
      ${metricCard("Index Price", market.indexPrice, "Oracle reference", formatPrice)}
      ${metricCard("Mark Price", market.markPrice, "Perpetual market reference", formatPrice)}
      ${metricCard("24h Volume", market.volume24h, "Awaiting backend field", formatPrice)}
      ${metricCard("Open Interest", market.openInterest, "Awaiting backend field", formatPrice)}
      ${metricCard("Funding Rate", market.fundingRate, "Perpetual funding", formatPercent)}
      ${metricCard("Max Leverage", market.maxLeverage, "Market configuration", (value) => `${value}x`)}
    </div>
  </section>`;
}

function renderOracleSummary(oracleResource, demoMode = false) {
  const oracle = oracleResource.data || {};
  const isReal = oracleResource.status === "success" && isAvailable(oracle.price);
  const status = oracleResource.status === "success" ? oracle.status : "UNAVAILABLE";
  return `<section class="surface oracle-summary" aria-labelledby="oracle-summary-title">
    ${sectionHeader("Oracle", "Price health and publication status", statusBadge(status, { label: oracleResource.status === "success" ? readableStatus(status) : "Unavailable", pulse: isReal }), "oracle-summary-title")}
    <div class="surface__body oracle-summary__body">
      <div class="oracle-summary__top">${modeBadge(isReal, demoMode)}<span class="surface-subtitle">${oracle.freshness ? `Freshness ${oracle.freshness}` : "Freshness —"}</span></div>
      <div class="oracle-summary__grid">
        ${priceWithLabel("Data source", oracle.source, "")}
        ${priceWithLabel("EMA", oracle.ema, "", formatPrice)}
        ${priceWithLabel("Breaker", oracle.circuitBreaker?.status, "")}
      </div>
      <a class="oracle-summary__link" href="/oracle" data-route="/oracle">View Oracle ${icon("arrow")}</a>
      ${oracleResource.status === "error" ? emptyNotice("Oracle unavailable. The endpoint did not return a readable payload.", "error") : ""}
    </div>
  </section>`;
}

export function renderMarket(state) {
  const { snapshot } = state;
  const demoMode = snapshot.mode === "simulated";
  const marketResource = { ...snapshot.market, healthStatus: snapshot.health?.status === "success" ? snapshot.health.data?.status : snapshot.health?.status };
  const oracleResource = snapshot.oracle;
  const market = marketResource.data || {};
  const hasErrors = marketResource.status === "error" || oracleResource.status === "error";
  return `<div class="page market-page container">
    ${pageHeader({ eyebrow: "MARKET / PERPETUALS", title: "Market", accent: "/ YPF-PERP", description: "A focused view of the perpetual market AustralFinance is building for Argentine assets.", meta: `${modeBadge(oracleResource.status === "success" || marketResource.status === "success", demoMode)} ${snapshot.lastRefresh ? `<span>updated ${new Date(snapshot.lastRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>` : ""}` })}
    ${hasErrors ? `<div class="notice-stack">${marketResource.status === "error" ? emptyNotice("Market data unavailable. Check the configured backend URL.", "error") : ""}${oracleResource.status === "error" ? emptyNotice("Oracle unavailable. Price and oracle metrics remain empty.", "error") : ""}</div>` : ""}
    ${renderMarketHeader(marketResource, oracleResource, demoMode)}
    <div class="market-layout">
      <div class="market-main">${renderChartPanel(market, demoMode)}${renderMetrics(market)}</div>
      <aside class="market-side">${renderOracleSummary(oracleResource, demoMode)}</aside>
    </div>
  </div>`;
}

export function enhanceMarket(root) {
  root.querySelectorAll("[data-trade-side]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-trade-side]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
    });
  });
  root.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-period]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
    });
  });
}
