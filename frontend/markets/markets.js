import { loadMarket, normalizeMarket } from "../shared/api/backend.js"
import { getWalletBalance, isWalletConnected, getWalletAddress } from "../shared/wallet/wallet.js"
import { formatPrice, formatPercent } from "../shared/utils/format.js"

export async function renderMarketPage() {
  const marketResource = await loadMarket("YPF-PERP")
  const market = marketResource.data ? normalizeMarket(marketResource.data) : null

  // WDK wallet integration
  let walletAddress = ""
  let walletBalance = "—"
  let walletConnected = false

  try {
    walletConnected = isWalletConnected()
    if (walletConnected) {
      walletAddress = await getWalletAddress()
      walletBalance = await getWalletBalance()
    }
  } catch (e) {
    // Wallet not connected - continue without it
  }

  // Render the market HTML
  const html = renderMarketView(market, walletConnected, walletAddress, walletBalance)
  return html
}

function renderMarketView(market, walletConnected, walletAddress, walletBalance) {
  // Header section
  const walletSection = walletConnected
    ? `<div class="market-wallet">
         <span class="wallet-label">Wallet:</span>
         <span class="wallet-address">${walletAddress.substring(0, 6)}...${walletAddress.substring(-4)}</span>
         <span class="wallet-balance">${walletBalance} USD₮</span>
       </div>`
    : `<div class="market-wallet wallet-disconnected">
         <button class="wallet-connect-btn">Connect Wallet</button>
       </div>`

  // Market data display
  const marketData = market
    ? `
      <div class="market-data">
        <div class="price-block">
          <div class="mark-price">Mark: ${formatPrice(market.markPrice)}</div>
          <div class="index-price">Index: ${formatPrice(market.indexPrice)}</div>
        </div>
        <div class="metrics">
          <div class="metric">
            <span class="metric-label">24h Volume</span>
            <span class="metric-value">${formatPrice(market.volume24h)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Open Interest</span>
            <span class="metric-value">${formatPrice(market.openInterest)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Funding Rate</span>
            <span class="metric-value">${formatPercent(market.fundingRate)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Max Leverage</span>
            <span class="metric-value">${market.maxLeverage}x</span>
          </div>
        </div>
        <div class="market-status">
          <span class="status-badge status-badge--${market.marketStatus === "LIVE" ? "positive" : "neutral"}">
            ${market.marketStatus || "—"}
          </span>
        </div>
      </div>
    `
    : `<div class="market-data unavailable">
        Market data unavailable. Backend not configured.
      </div>`

  return `
    <section class="market-page">
      ${walletSection}
      ${marketData}
      <div class="price-readout" id="price-readout">${market ? formatPrice(market.markPrice) : "—"}</div>
    </section>
  `
}