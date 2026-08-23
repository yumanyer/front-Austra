import { createWallet, createWalletClient, configureChains } from "@tetherto/wdk"

let wallet = null
let walletClient = null

export async function initWDKWallet() {
  if (walletClient) return walletClient

  wallet = await createWallet({
    id: "australfinance-wallet",
    networks: ["mainnet", "sepolia"],
  })

  walletClient = createWalletClient({ wallet })
  return walletClient
}

export async function getWDKAddress() {
  const client = await initWDKWallet()
  return await client.getAddress()
}

export async function getWDKBalance() {
  const client = await initWDKWallet()
  return await client.getBalance({ chainId: 1 })
}

export async function sendWDKTransaction({ to, amount, currency }) {
  const client = await initWDKWallet()
  return await client.send({ to, amount, currency })
}

export async function getWDKNetworkInfo() {
  const client = await initWDKWallet()
  // WDK doesn't expose chain name directly via simple API
  // Return mainnet by default; callers can check chain ID
  return { chainId: 1, name: "mainnet" }
}

export function isWDKAvailable() {
  try {
    import("@tetherto/wdk")
    return true
  } catch {
    return false
  }
}