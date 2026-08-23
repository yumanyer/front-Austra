import { bindWalletEvents } from "../wallet/events.js"
import { connectWallet, disconnectWallet, isWalletConnected, getWalletAddress, getWalletBalance } from "../wallet/wallet.js"

let navbarComponent = null

export function createNavbar() {
  // Create navbar element if not exists
  let navbar = document.querySelector("#austral-navbar")
  if (!navbar) {
    navbar = document.createElement("nav")
    navbar.id = "austral-navbar"
    navbar.className = "site-header"
    navbar.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="/" aria-label="AustralFinance home">
          <img class="brand-mark" src="../logo.png" alt="" width="34" height="34" />
          <span class="brand-wordmark">austral<strong>finance</strong><span class="brand-dot">.fi</span></span>
        </a>
        <div class="primary-nav" aria-label="Primary navigation">
          <a class="nav-link is-active" href="/" data-route="/">Market</a>
          <a class="nav-link" href="/oracle" data-route="/oracle">Oracle</a>
          <a class="nav-link" href="/infrastructure" data-route="/infrastructure">Infrastructure</a>
        </div>
        <div class="wallet-area" style="display: flex; align-items: center; gap: 0.5rem;">
          <button class="wallet-button" id="walletConnectBtn" type="button">
            Connect Wallet
          </button>
          <span id="walletAddress" style="display: none; color: var(--muted); font-size: 0.65rem; font-family: 'IBM Plex Mono', monospace;"></span>
          <span id="walletBalance" style="display: none; color: var(--muted); font-size: 0.65rem; font-family: 'IBM Plex Mono', monospace;"></span>
        </div>
      </div>
    `
    document.body.insertBefore(navbar, document.body.firstChild)
  }

  // Setup wallet button click
  const walletBtn = document.getElementById("walletConnectBtn")
  const walletAddressEl = document.getElementById("walletAddress")
  const walletBalanceEl = document.getElementById("walletBalance")

  walletBtn.addEventListener("click", async () => {
    try {
      const result = await connectWallet()
      if (result.connected) {
        walletBtn.textContent = `${walletAddress?.substring(0, 6)}...${walletAddress?.substring(-4)}`
        walletBtn.classList.add("connected")
        walletAddressEl.style.display = "inline"
        walletAddressEl.textContent = walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(-4)}` : ""
        walletBalanceEl.style.display = "inline"
        walletBalanceEl.textContent = `${result.balance} USD₮`
        showToast("Wallet connected successfully")
      }
    } catch (error) {
      showToast("Wallet connection failed")
    }
  })

  // Subscribe to wallet changes
  const unsubscribe = isWalletConnected()
    ? bindWalletEvents(
        null,
        (address) => {
          walletAddressEl.textContent = `${address.substring(0, 6)}...${address.substring(-4)}`
          walletBalanceEl.textContent = `${getWalletBalance()} USD₮`
        },
        (balance) => {
          walletBalanceEl.textContent = `${balance} USD₮`
        }
      )
    : null

  return { unsubscribe, element: navbar }
}

export function showToast(message) {
  const existing = document.querySelector(".austral-toast")
  if (existing) existing.remove()

  const toast = document.createElement("div")
  toast.className = "austral-toast"
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 40;
    max-width: min(360px, calc(100% - 2.5rem));
    padding: 0.8rem 1rem;
    border: 1px solid rgba(79,182,232,0.45);
    border-radius: var(--radius-sm);
    background: var(--navy-800);
    color: var(--ink);
    box-shadow: var(--shadow-panel);
    font-size: 0.76rem;
    opacity: 0;
    pointer-events: none;
    transform: translateY(10px);
    transition: opacity 180ms var(--ease-out), transform 180ms var(--ease-out);
  `
  document.body.appendChild(toast)

  // Show toast
  setTimeout(() => {
    toast.style.opacity = "1"
    toast.style.transform = "translateY(0)"
  }, 10)

  // Hide after 2.6 seconds
  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateY(10px)"
    setTimeout(() => toast.remove(), 300)
  }, 2600)
}