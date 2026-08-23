import { initWDKWallet, getWDKAddress, getWDKBalance } from "./connector.js"

let walletConnected = false
let walletAddress = null
let walletBalance = "—"
let walletInterval = null

export async function connectWallet() {
  try {
    await initWDKWallet()
    walletConnected = true
    walletAddress = await getWDKAddress()
    walletBalance = await getWDKBalance()

    // Start periodic balance refresh
    if (walletInterval) clearInterval(walletInterval)
    walletInterval = setInterval(async () => {
      try {
        walletBalance = await getWDKBalance()
      } catch (e) {
        // silently fail - balance will show last known value
      }
    }, 15000)

    // Notify listeners
    document.dispatchEvent(new CustomEvent("wallet:changed", {
      detail: { connected: true, address: walletAddress, balance: walletBalance }
    }))

    return { connected: true, address: walletAddress, balance: walletBalance }
  } catch (error) {
    walletConnected = false
    walletAddress = null
    walletBalance = "—"
    document.dispatchEvent(new CustomEvent("wallet:changed", {
      detail: { connected: false, address: null, balance: "—" }
    }))
    throw error
  }
}

export function disconnectWallet() {
  if (walletInterval) {
    clearInterval(walletInterval)
    walletInterval = null
  }
  walletConnected = false
  walletAddress = null
  walletBalance = "—"
  document.dispatchEvent(new CustomEvent("wallet:changed", {
    detail: { connected: false, address: null, balance: "—" }
  }))
}

export function isWalletConnected() {
  return walletConnected
}

export async function getWalletAddress() {
  if (!walletConnected) return null
  return walletAddress
}

export async function getWalletBalance() {
  if (!walletConnected) return "—"
  return walletBalance
}

export async function getWalletNetwork() {
  if (!walletConnected) return null
  // Return chain ID from WDK
  try {
    const balance = await getWDKBalance({ chainId: 1 })
    return 1 // mainnet, or could derive from wallet
  } catch {
    return 1
  }
}

export function onWalletChange(callback) {
  const handler = (event) => callback(event.detail)
  document.addEventListener("wallet:changed", handler)
  return () => document.removeEventListener("wallet:changed", handler)
}

// Auto-connect on page load for demo purposes
// In production, this would be triggered by user action
export async function tryAutoConnect() {
  // Don't auto-connect - wait for user interaction
  // This is kept for framework compatibility
  return { connected: false, address: null, balance: "—" }
}