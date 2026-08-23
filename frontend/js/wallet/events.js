export function bindWalletEvents(walletAdapter, callbacks = {}) {
  if (!walletAdapter || walletAdapter.status === "NOT_CONFIGURED") return () => {};

  const cleanups = [];
  if (typeof walletAdapter.on === "function") {
    const handleAccountsChanged = (accounts) => callbacks.onAccountChange?.(accounts?.[0]);
    const handleChainChanged = (chainId) => callbacks.onChainChange?.(chainId);
    walletAdapter.on("accountsChanged", handleAccountsChanged);
    walletAdapter.on("chainChanged", handleChainChanged);
    cleanups.push(() => walletAdapter.off?.("accountsChanged", handleAccountsChanged));
    cleanups.push(() => walletAdapter.off?.("chainChanged", handleChainChanged));
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
