import { createWalletClient, http, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPrice } from '../oracle/index.js';

// NOTE: this writes to the mirror contract on HyperEVM, which HyperCore does NOT read. It is
// an auditable on-chain mirror of what the oracle published, not the HIP-3 feed —
// that path is src/hip3/publisher.js (perpDeploy.setOracle).

import { config } from '../config.js';

const {
  intervalMs: PUSH_INTERVAL_MS,
  contractAddress: CONTRACT_ADDRESS,
  privateKey: PRIVATE_KEY,
  rpcUrl: RPC,
  chainId: CHAIN_ID,
  enabled: PUSHER_ENABLED,
} = config.pusher;

/** @type {string|null} */
let lastPushTx = null;
let lastPushAt = 0;
let inFlight = false;

const hyperliquidTestnet = {
  id: CHAIN_ID,
  name: 'Hyperliquid Testnet',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

let walletClient = null;
let abiCache = null;
// Name of the compiled ABI in contracts/abi, without the .json extension.
const ABI_NAME = process.env.ORACLE_ABI_NAME ?? 'YPFOracle';

let pushTimer = null;

function loadAbi() {
  if (abiCache) return abiCache;
  let abiPathTried = null;
  const dir = dirname(fileURLToPath(import.meta.url));
  // Must track the contract name in contracts/src. This path has now broken twice
  // across renames (GGAL -> Asset -> YPF), and the failure is silent — loadAbi()
  // just returns null — so the warning below names the path it tried.
  const abiPath = join(dir, `../../../contracts/abi/${ABI_NAME}.json`);
  abiPathTried = abiPath;
  try {
    abiCache = JSON.parse(readFileSync(abiPath, 'utf8'));
    return abiCache;
  } catch {
    console.warn(`[pusher] Could not read the oracle ABI at ${abiPathTried}`);
    return null;
  }
}

async function push() {
  if (!PUSHER_ENABLED) return;

  let oracle;
  try {
    oracle = getPrice();
  } catch {
    return;
  }

  // A frozen or stale price is still pushed on purpose — it is the breaker's held
  // value, which is exactly what the market should mark against. Simulated prices
  // are pushed too: the market is a labelled testnet rehearsal, and /market
  // reports simulated:true alongside them. Only a hard error is skipped.
  if (oracle.status === 'error') return;
  if (!Number.isFinite(oracle.price) || oracle.price <= 0) {
    console.warn('[pusher] Non-finite price, skipping push');
    return;
  }

  const abi = loadAbi();
  if (!abi) {
    console.warn('[pusher] Could not load the oracle ABI — skipping push');
    return;
  }

  if (!walletClient) {
    const account = privateKeyToAccount(PRIVATE_KEY);
    walletClient = createWalletClient({ account, chain: hyperliquidTestnet, transport: http(RPC) });
  }

  try {
    const price6 = BigInt(Math.round(oracle.price * 1_000_000));
    const ts = BigInt(oracle.timestamp);
    const symbolBytes32 = keccak256(toHex(config.oracle.symbol));

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'pushPrice',
      args: [symbolBytes32, price6, ts],
    });

    lastPushTx = txHash;
    lastPushAt = oracle.timestamp;
    console.log(`[pusher] Pushed $${oracle.price} → tx ${txHash}`);
  } catch (err) {
    console.error('[pusher] Push failed:', err.message);
  }
}

/** Pusher state for /health and /market. */
export function pusherState() {
  return {
    enabled: PUSHER_ENABLED,
    contract: CONTRACT_ADDRESS ?? null,
    intervalMs: PUSH_INTERVAL_MS,
    lastPushTx,
    lastPushAt,
  };
}

/**
 * Runs `push()` guarded against overlap: if a write is still in flight when the
 * next tick fires, viem would request a nonce for a second concurrent
 * writeContract and get back the same one, causing one tx to fail or replace the
 * other. Skipping the tick instead is safe — the next interval retries.
 */
async function tick() {
  if (inFlight) return;
  inFlight = true;
  try {
    await push();
  } finally {
    inFlight = false;
  }
}

export function startPusher() {
  if (!PUSHER_ENABLED) {
    const missing = [
      CONTRACT_ADDRESS ? null : 'ORACLE_CONTRACT_ADDRESS',
      PRIVATE_KEY ? null : 'PUSHER_PRIVATE_KEY',
    ].filter(Boolean);
    console.log(`[pusher] Disabled — missing ${missing.join(' and ')}`);
    return;
  }
  console.log(`[pusher] Starting, pushing every ${PUSH_INTERVAL_MS}ms to ${CONTRACT_ADDRESS} (chain ${CHAIN_ID})`);
  tick();
  pushTimer = setInterval(tick, PUSH_INTERVAL_MS);
}

/** Stops the push loop so the process can exit cleanly. */
export function stopPusher() {
  if (pushTimer) clearInterval(pushTimer);
  pushTimer = null;
}
