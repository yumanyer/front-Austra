import { updatePriceChart } from "../js/components/chart.js";
import { bindPeriodButtons, formatField, formatMetric, formatFreshness, formatUpdated, loadMockSnapshot, setHidden, setMode, setStatus, setText, updateSystemStrip } from "../js/page-data.js";
import { isAvailable, normalizeStatus, readableStatus } from "../js/utils.js";

const root = document.querySelector(".market-page");
const snapshot = loadMockSnapshot();
const marketResource = snapshot.market;
const oracleResource = snapshot.oracle;
const market = marketResource.data;
const oracle = oracleResource.data;

function updateMarket() {
  const demoMode = snapshot.mode === "mock";
  const hasPrice = isAvailable(oracle.price);
  const marketStatus = market.marketStatus || "UNAVAILABLE";
  const oracleStatus = oracle.status || "UNAVAILABLE";

  setMode(root.querySelector("[data-market-mode]"), true, demoMode);
  setText(root.querySelector("[data-market-updated]"), formatUpdated(snapshot.fetchedAt));
  setStatus(root.querySelector("[data-market-status]"), marketStatus, { label: readableStatus(marketStatus), pulse: normalizeStatus(marketStatus) === "LIVE" });
  setText(root.querySelector("[data-price-value]"), formatField(oracle.price, (value) => `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`));

  const changeElement = root.querySelector("[data-change24h]");
  setText(changeElement, formatMetric(market.change24h, "percent"));
  changeElement?.classList.toggle("change-readout__value--down", Number(market.change24h) < 0);

  setMode(root.querySelector("[data-price-mode]"), hasPrice, demoMode);
  setText(root.querySelector("[data-price-note]"), `Mock oracle reference · ${oracle.source}`);

  const metricKinds = { indexPrice: "price", markPrice: "price", volume24h: "price", openInterest: "price", fundingRate: "percent", maxLeverage: "leverage" };
  root.querySelectorAll("[data-market-field]").forEach((element) => setText(element, formatMetric(market[element.dataset.marketField], metricKinds[element.dataset.marketField])));

  const points = market.raw.history;
  updatePriceChart(root.querySelector("[data-chart]"), root.querySelector("[data-chart-empty]"), points);
  setText(root.querySelector("[data-chart-footnote]"), "Mock price series · visual preview only");

  setStatus(root.querySelector("[data-oracle-status]"), oracleStatus, { label: readableStatus(oracleStatus), pulse: true });
  setMode(root.querySelector("[data-oracle-mode]"), true, demoMode);
  setText(root.querySelector("[data-oracle-freshness]"), formatFreshness(oracle.freshness));
  setText(root.querySelector('[data-oracle-field="source"]'), oracle.source);
  setText(root.querySelector('[data-oracle-field="ema"]'), formatMetric(oracle.ema));
  setText(root.querySelector('[data-oracle-field="breaker"]'), formatField(oracle.circuitBreaker.status, readableStatus));
  setHidden(root.querySelector("[data-market-notices]"), true);
}

bindPeriodButtons(root);
updateMarket();
updateSystemStrip();
