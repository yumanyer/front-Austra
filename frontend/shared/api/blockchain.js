import { getWDKAddress, getWDKBalance, initWDKWallet } from "../wallet/connector.js"

let walletClient = null

export async function initBlockchainWallet() {
  walletClient = await initWDKWallet()
  return walletClient
}

export async function getConnectedAddress() {
  if (!walletClient) await initBlockchainWallet()
  return await walletClient.getAddress()
}

export async function getConnectedBalance() {
  if (!walletClient) await initBlockchainWallet()
  return await walletClient.getBalance({ chainId: 1 })
}

export async function sendTransaction({ to, amount, currency }) {
  if (!walletClient) await initBlockchainWallet()
  return await walletClient.send({ to, amount, currency })
}

export async function getNetworkInfo() {
  if (!walletClient) await initBlockchainWallet()
  // WDK doesn't directly expose network name, return basic info
  return { chainId: 1, name: "mainnet" }
}

export async function getWalletStatus() {
  if (!walletClient) await initBlockchainWallet()
  try {
    const address = await walletClient.getAddress()
    const balance = await walletClient.getBalance({ chainId: 1 })
    return { connected: true, address, balance }
  } catch (e) {
    return { connected: false, address: null, balance: "—" }
  }
}