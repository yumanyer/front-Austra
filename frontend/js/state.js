import { loadSnapshot } from "./api.js";
import { DEMO_SNAPSHOT } from "./demo-data.js";

export function createAppState() {
  const state = {
    route: "/",
    loading: true,
    lastRefresh: null,
    snapshot: {
      health: { status: "loading", data: null, error: null },
      oracle: { status: "loading", data: null, error: null },
      market: { status: "loading", data: null, error: null },
    },
    listeners: new Set(),
  };

  return {
    get() {
      return state;
    },
    subscribe(listener) {
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    },
    setRoute(route) {
      state.route = route;
      notify();
    },
    async refresh() {
      state.loading = true;
      notify();
      const useDemo = window.AUSTRAL_CONFIG?.USE_DEMO_DATA === true;
      const snapshot = useDemo ? JSON.parse(JSON.stringify(DEMO_SNAPSHOT)) : await loadSnapshot();
      state.snapshot = snapshot;
      state.loading = false;
      state.lastRefresh = snapshot.fetchedAt;
      notify();
      return snapshot;
    },
  };

  function notify() {
    state.listeners.forEach((listener) => listener(state));
  }
}
