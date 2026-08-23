const state = {
  wallet: {
    connected: false,
    address: null,
    chainId: null,
  },
  network: {
    chainId: null,
    name: null,
  },
  mode: "demo", // "demo" or "live"
  lastRefresh: null,
}

export function getState() {
  return { ...state }
}

export function setWallet(walletInfo) {
  state.wallet.connected = walletInfo.connected !== undefined ? walletInfo.connected : false
  state.wallet.address = walletInfo.address || null
  state.wallet.chainId = walletInfo.chainId || null
}

export function setNetwork(networkInfo) {
  state.network.chainId = networkInfo.chainId !== undefined ? networkInfo.chainId : null
  state.network.name = networkInfo.name || null
}

export function setMode(mode) {
  state.mode = mode
}

export function setLastRefresh(timestamp) {
  state.lastRefresh = timestamp
}

export function subscribe(listener) {
  // Simple subscription - call listener immediately with current state
  listener(getState())
  return () => {} // no-op unsubscribe for simplicity
}