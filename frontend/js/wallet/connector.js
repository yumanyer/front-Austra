import { createWallet, createWalletClient, configureChains, createClient, WETH } from "@tetherto/wdk";

let walletClient = null;
let wallet = null;

export async function initWDKWallet() {
  wallet = await createWallet({
    id: "australfinance-wallet",
    networks: ["mainnet", "sepolia"],
  });

  walletClient = createWalletClient({ wallet });
  return { wallet, walletClient };
}

export async function getWDKWalletClient() {
  if (!walletClient) await initWDKWallet();
  return walletClient;
}

export async function getWDKAddress() {
  const client = await getWDKWalletClient();
  return await client.getAddress();
}

export async function getWDKBalance() {
  const client = await getWDKWalletClient();
  return await client.getBalance({ chainId: 1 });
}

export async function sendWDKTransaction({ to, amount, currency }) {
  const client = await getWDKWalletClient();
  return await client.send({ to, amount, currency });
}