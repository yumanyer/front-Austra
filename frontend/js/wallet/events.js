export function bindWalletEvents(walletClient, callbacks = {}) {
  if (walletClient.on) {
    walletClient.on("accountsChanged", (accounts) => {
      if (callbacks.onAccountChange) callbacks.onAccountChange(accounts[0]);
    });

    walletClient.on("chainChanged", (chainId) => {
      if (callbacks.onChainChange) callbacks.onChainChange(chainId);
    });
  }

  walletClient.getBalance({ chainId: 1 }).then((balance) => {
    if (callbacks.onInitialBalance) callbacks.onInitialBalance(balance);
  });
}