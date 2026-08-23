import { loadOraclePrice, normalizeOracle } from "../shared/api/backend.js"
import { isWalletConnected, getWalletAddress, getWalletBalance } from "../shared/wallet/wallet.js"
import { formatPrice, formatPercent, formatBoolean, readableStatus, normalizeStatus, statusTone } from "../shared/utils/format.js"

export async function renderOraclePage() {
  const oracleResource = await loadOraclePrice("YPF")
  const oracle = oracleResource.data ? normalizeOracle(oracleResource.data) : null

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

  // Render the oracle HTML
  const html = renderOracleView(oracle, walletConnected, walletAddress, walletBalance)
  return html
}

function renderOracleView(oracle, walletConnected, walletAddress, walletBalance) {
  // Wallet connection status
  const walletSection = walletConnected
    ? `<div class="oracle-wallet">
         <span>Connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(-4)}</span>
         <span>Balance: ${walletBalance} USD₮</span>
       </div>`
    : `<div class="oracle-wallet wallet-disconnected">
         <button class="wallet-connect-btn">Connect Wallet</button>
       </div>`

  // Oracle data display
  const oracleData = oracle
    ? `
      <div class="oracle-details">
        <div class="price-info">
          <div class="oracle-price">Price: ${formatPrice(oracle.price)}</div>
          <div class="oracle-ema">EMA: ${formatPrice(oracle.ema)}</div>
        </div>
        <div class="oracle-metrics">
          <div class="metric">
            <span class="metric-label">Last Print</span>
            <span class="metric-value">${formatPrice(oracle.lastPrint)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Bid</span>
            <span class="metric-value">${formatPrice(oracle.bid)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Ask</span>
            <span class="metric-value">${formatPrice(oracle.ask)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Spread</span>
            <span class="metric-value">${formatPrice(oracle.spread)}</span>
          </div>
        </div>
        <div class="oracle-ccl">
          <span class="metric-label">CCL</span>
          <span class="metric-value">${formatPrice(oracle.ccl)}</span>
          <span class="metric-label">Implied CCL</span>
          <span class="metric-value">${formatPrice(oracle.impliedCcl)}</span>
        </div>
        <div class="oracle-status">
          <span class="status-badge status-badge--${statusTone(oracle.status)}">
            ${readableStatus(normalizeStatus(oracle.status))}
          </span>
        </div>
        <div class="oracle-market-open">
          ${formatBoolean(oracle.marketOpen) ? "Market Open" : "Market Closed"}
        </div>
        <div class="oracle-freshness">
          Freshness: ${oracle.freshness || "—"}
        </div>
      </div>
    `
    : `<div class="oracle-details unavailable">
        Oracle data unavailable. Backend not configured.
      </div>`

  return `
    <section class="oracle-page">
      ${walletSection}
      ${oracleData}
    </section>
  `
}