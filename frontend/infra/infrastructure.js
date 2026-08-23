import { emptyNotice } from "../js/components/common.js";
import { loadPageSnapshot } from "../js/state.js";
import { isAvailable, modeBadge, readableStatus, statusBadge } from "../js/utils/format.js";
import { wireGlobalUI } from "../js/app.js";

const page = document.querySelector('[data-page="infrastructure"]');

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

function renderSystem(snapshot) {
  const demoMode = snapshot.mode === "simulated";
  const healthResource = snapshot.health;
  const healthStatus = healthResource.status === "success" ? healthResource.data?.status : "UNAVAILABLE";
  setHTML("[data-system-status]", demoMode ? modeBadge(true, true) : statusBadge(healthStatus, { label: readableStatus(healthStatus), pulse: healthStatus === "CONNECTED" }));
  setText("[data-system-note]", demoMode ? "Hardcoded visual fixture · no backend request" : "No backend snapshot");
}

function renderInfrastructure(snapshot) {
  const demoMode = snapshot.mode === "simulated";
  const { health, oracle, market } = snapshot;
  const healthData = health.data || {};
  const oracleData = oracle.data || {};
  const marketData = market.data || {};
  const healthOracle = healthData.oracle || {};
  const healthHip3 = healthData.hip3 || {};
  const statuses = {
    source: oracle.status === "success" && isAvailable(oracleData.source) ? "CONNECTED" : isAvailable(healthOracle.source) ? "CONNECTED" : "UNAVAILABLE",
    engine: oracle.status === "success" && isAvailable(oracleData.status) ? oracleData.status : isAvailable(healthOracle.status) ? healthOracle.status : "UNAVAILABLE",
    hip: isAvailable(marketData.hip3?.status) ? marketData.hip3.status : isAvailable(healthHip3.status) ? healthHip3.status : healthHip3.enabled === true ? "ENABLED" : "UNAVAILABLE",
    core: isAvailable(marketData.hyperCoreStatus) ? marketData.hyperCoreStatus : "UNAVAILABLE",
    evm: isAvailable(marketData.hyperEvmStatus) ? marketData.hyperEvmStatus : "UNAVAILABLE",
  };
  const hasAnyReal = Object.values(statuses).some((value) => value !== "UNAVAILABLE");

  renderSystem(snapshot);
  setHTML("[data-page-mode]", modeBadge(hasAnyReal, demoMode));
  setHTML("[data-page-status]", statusBadge(hasAnyReal ? "CONNECTED" : "UNAVAILABLE", { label: hasAnyReal ? "Partial system map" : "Unavailable" }));
  const notice = page?.querySelector("[data-infra-notice]");
  if (notice) {
    const content = demoMode ? "DEMO DATA: component statuses and displayed metrics are hardcoded for visual review only. No chain connection is being claimed." : !hasAnyReal ? "Infrastructure statuses are unavailable because no backend or chain status endpoint is configured." : "";
    notice.innerHTML = content ? emptyNotice(content, "warning") : "";
    notice.hidden = !content;
  }

  Object.entries(statuses).forEach(([key, value]) => {
    setHTML(`[data-infra-status="${key}"]`, statusBadge(value, { label: readableStatus(value) }));
    setText(`[data-infra-origin="${key}"]`, value === "UNAVAILABLE" ? "—" : demoMode ? "fixture" : "backend");
  });
}

wireGlobalUI(document);
loadPageSnapshot().then(renderInfrastructure);
