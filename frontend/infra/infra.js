import { loadInfrastructure } from "../shared/api/backend.js"
import { isWalletConnected, getWalletAddress, getWalletBalance } from "../shared/wallet/wallet.js"

export async function renderInfraPage() {
  const infraResource = await loadInfrastructure()

  // WDK wallet integration
  let walletConnected = false
  let walletAddress = ""
  let walletBalance = "—"

  try {
    walletConnected = isWalletConnected()
    if (walletConnected) {
      walletAddress = await getWalletAddress()
      walletBalance = await getWalletBalance()
    }
  } catch (e) {
    // Wallet not connected - continue without it
  }

  // Render the infrastructure HTML
  const html = renderInfraView(infraResource, walletConnected, walletAddress, walletBalance)
  return html
}

function renderInfraView(infraResource, walletConnected, walletAddress, walletBalance) {
  // Wallet connection status
  const walletSection = walletConnected
    ? `<div class="infra-wallet">
         <span>WDK Connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(-4)}</span>
         <span>Balance: ${walletBalance} USD₮</span>
       </div>`
    : `<div class="infra-wallet wallet-disconnected">
         <button class="wallet-connect-btn">Connect Wallet</button>
       </div>`

  // Infrastructure data display
  const infraData = infraResource
    ? `
      <div class="infra-details">
        <div class="backend-status">
          <span class="status-badge status-badge--${infraResource.status === "success" ? "positive" : "neutral"}">
            ${infraResource.status || "—"}
          </span>
        </div>
        <div class="network-info">
          <span>Chain: mainnet</span>
          <span>RPC: configured</span>
        </div>
        <div class="oracle-status">
          <span class="status-badge status-badge--${infraResource.oracle?.status === "success" ? "positive" : "warning"}">
            Oracle: ${infraResource.oracle?.status || "—"}
          </span>
        </div>
        <div class="market-status">
          <span class="status-badge status-badge--${infraResource.market?.status === "success" ? "positive" : "warning"}">
            Market: ${infraResource.market?.status || "—"}
          </span>
        </div>
      </div>
    `
    : `<div class="infra-details unavailable">
        Infrastructure status unavailable. Backend not configured.
      </div>`

  return `
    <section class="infra-page">
      ${walletSection}
      ${infraData}
    </section>
  `
}