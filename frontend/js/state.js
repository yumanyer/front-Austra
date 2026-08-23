import { DEMO_SNAPSHOT } from "./demo-data.js";

const UNAVAILABLE_SNAPSHOT = {
  mode: "unavailable",
  health: { status: "error", data: null, error: "Backend integration is not configured" },
  oracle: { status: "error", data: null, error: "Oracle integration is not configured" },
  market: { status: "error", data: null, error: "Market integration is not configured" },
  fetchedAt: null,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function loadPageSnapshot() {
  // Keep the visual fixture as the default until a later integration phase.
  if (window.AUSTRAL_CONFIG?.USE_DEMO_DATA !== false) return clone(DEMO_SNAPSHOT);
  return clone(UNAVAILABLE_SNAPSHOT);
}
