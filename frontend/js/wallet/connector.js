import { createUnavailableAdapter } from "../integrations/unavailable.js";

const walletAdapter = createUnavailableAdapter("Wallet", [
  "connect",
  "getAddress",
  "getBalance",
  "sendTransaction",
]);

export function getWalletAdapter() {
  return walletAdapter;
}

export async function connectWallet() {
  return walletAdapter.connect();
}

export async function getWalletAddress() {
  return walletAdapter.getAddress();
}

export async function getWalletBalance() {
  return walletAdapter.getBalance();
}

export async function sendWalletTransaction(transaction) {
  return walletAdapter.sendTransaction(transaction);
}
