import { createUnavailableAdapter } from "../integrations/unavailable.js";

const blockchainAdapter = createUnavailableAdapter("Blockchain", [
  "getNetwork",
  "getHealth",
  "getOracleState",
  "submitTransaction",
]);

export function getBlockchainAdapter() {
  return blockchainAdapter;
}

export async function getBlockchainNetwork() {
  return blockchainAdapter.getNetwork();
}

export async function getBlockchainHealth() {
  return blockchainAdapter.getHealth();
}

export async function getOnChainOracleState() {
  return blockchainAdapter.getOracleState();
}

export async function submitBlockchainTransaction(transaction) {
  return blockchainAdapter.submitTransaction(transaction);
}
