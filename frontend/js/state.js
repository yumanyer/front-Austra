import { loadSnapshot } from "./api/index.js";

function loadingResource() {
  return { status: "loading", data: null, error: null, errorCode: null };
}

function emptySnapshot() {
  return {
    health: loadingResource(),
    oracle: loadingResource(),
    market: loadingResource(),
  };
}

export function createAppState() {
  const state = {
    loading: true,
    lastRefresh: null,
    snapshot: emptySnapshot(),
  };
  const listeners = new Set();
  let refreshPromise;

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  return {
    get() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async refresh() {
      if (refreshPromise) return refreshPromise;
      state.loading = true;
      notify();
      refreshPromise = loadSnapshot()
        .then((snapshot) => {
          state.snapshot = snapshot;
          state.loading = false;
          state.lastRefresh = snapshot.fetchedAt || null;
          notify();
          return snapshot;
        })
        .catch((error) => {
          state.loading = false;
          state.lastRefresh = null;
          state.snapshot = {
            mode: "real",
            ...emptySnapshot(),
            error: error?.message || "Unable to load data snapshot",
          };
          notify();
          return state.snapshot;
        })
        .finally(() => {
          refreshPromise = undefined;
        });
      return refreshPromise;
    },
  };
}

// Compatibility helper for page modules that only need one lifecycle snapshot.
export function loadPageSnapshot() {
  const appState = createAppState();
  return appState.refresh();
}
