import { loadMockSnapshot, setHidden, setMode, setStatus, setText, updateSystemStrip } from "../js/page-data.js";
import { isAvailable, readableStatus } from "../js/utils/index.js";

const root = document.querySelector(".infra-page");
const snapshot = loadMockSnapshot();
const oracle = snapshot.oracle.data;
const market = snapshot.market.data;
const rawMarket = market.raw;
const mockMode = snapshot.mode === "mock";

const statuses = {
  data: "READY",
  engine: oracle.status,
  hip: rawMarket.hip3Status,
  core: rawMarket.hyperCoreStatus,
  evm: rawMarket.hyperEvmStatus
};
const hasReadyComponent = Object.values(statuses).some((value) => isAvailable(value));

Object.entries(statuses).forEach(([key, value]) => {
  setStatus(root.querySelector(`[data-component-status="${key}"]`), value, { label: readableStatus(value), pulse: true });
  setText(root.querySelector(`[data-component-origin="${key}"]`), mockMode ? "mock" : "—");
});

setMode(root.querySelector("[data-infra-mode]"), hasReadyComponent, mockMode);
setStatus(root.querySelector("[data-infra-status]"), hasReadyComponent ? "READY" : "UNAVAILABLE", { label: mockMode ? "Mock system map" : readableStatus(hasReadyComponent ? "READY" : "UNAVAILABLE"), pulse: hasReadyComponent });
setHidden(root.querySelector("[data-infra-demo]"), !mockMode);
setHidden(root.querySelector("[data-infra-notice]"), mockMode || hasReadyComponent);
updateSystemStrip();
