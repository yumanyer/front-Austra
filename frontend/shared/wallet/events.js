export function bindWalletEvents(walletClient, onAccountChange, onBalanceChange) {
  if (!walletClient) return

  // Listen for account changes
  walletClient.on("accountsChanged", (accounts) => {
    if (accounts && accounts.length > 0 && onAccountChange) {
      onAccountChange(accounts[0])
    }
  })

  // Listen for chain changes
  walletClient.on("chainChanged", (chainId) => {
    if (onBalanceChange) {
      onBalanceChange(chainId)
    }
    // Also refresh balance when chain changes
    if (onBalanceChange) {
      walletClient.getBalance({ chainId }).then((balance) => {
        onBalanceChange(balance)
      })
    }
  })

  // Initial balance fetch
  walletClient.getBalance({ chainId: 1 }).then((balance) => {
    if (onBalanceChange) onBalanceChange(balance)
  })
}