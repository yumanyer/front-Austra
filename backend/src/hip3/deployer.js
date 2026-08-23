import { formatPrice } from '@nktkas/hyperliquid/utils';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config.js';
import { getPrice, pollOnce } from '../oracle/index.js';
import { seedEma } from '../oracle/ema.js';
import { fetchHistoricalCloses } from '../oracle/fetcher.js';
import { info } from './infoClient.js';
import { runPreflight, main as preflightMain } from './preflight.js';

const {
  dex, coin, assetName, szDecimals, fullName, collateralToken, marginTableId, marginMode,
  oracleUpdaterKey, isTestnet, maxGas,
} = config.hip3;

/**
 * Builds the registerAsset2 action that creates the market.
 *
 * `schema` carries the dex-level configuration and is only accepted on the first
 * asset of a dex — subsequent assets must pass null. `oracleUpdater` is the address
 * that will be allowed to sign setOracle afterwards, which is why the deployer and
 * the publisher share one key by default.
 *
 * Parameters mirror felix:TSLA, an equity perp already live on testnet:
 * szDecimals 2 on margin table 5 (built-in, 5x).
 *
 * @param {number} price - initial oracle price, from the live oracle
 * @param {{ isFirstAsset?: boolean, oracleUpdater?: string }} [opts]
 */
export function buildRegisterAsset(price, { isFirstAsset = true, oracleUpdater } = {}) {
  const oraclePx = formatPrice(price, szDecimals, 'perp');

  return {
    registerAsset2: {
      // null pays the current deploy auction price (500 HYPE today); 0 asks for a
      // reserve deployment instead.
      maxGas,
      dex,
      assetRequest: {
        // Must be the fully-qualified dex:coin, not the bare ticker.
        coin: assetName,
        szDecimals,
        oraclePx,
        marginTableId,
        marginMode,
      },
      schema: isFirstAsset
        ? { fullName, collateralToken, oracleUpdater: oracleUpdater ?? null }
        : null,
    },
  };
}

/** True when the dex does not exist yet, so `schema` must be supplied. */
async function isFirstAsset() {
  const dexs = await info({ type: 'perpDexs' });
  if (dexs === undefined) return null; // unknown — refuse rather than guess
  return !dexs.filter(Boolean).some((d) => d.name === dex);
}

/**
 * Gets an initial oracle price. Falls back to the last historical close when the
 * live oracle has not produced a price in this process yet.
 */
async function initialPrice(symbol) {
  try {
    return getPrice().price;
  } catch {
    const closes = await fetchHistoricalCloses(symbol, config.oracle.seedCloses);
    if (closes) seedEma([closes[closes.length - 1]]);
    await pollOnce(symbol);
    return getPrice().price;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const send = argv.includes('--send');

  console.log(`\nHIP-3 deploy — ${dex}:${coin} on ${isTestnet ? 'testnet' : 'MAINNET'}`);

  // Only hard blockers stop a send — a missing key, a taken dex name, a bad
  // collateral token. The stake floor is reported but never blocks: confirming it
  // is precisely what the attempt is for.
  if (!(await preflightMain())) {
    if (send) {
      console.error('Refusing to send: a hard blocker is unresolved (see FAIL above).\n');
      return false;
    }
    console.log('(blocked; continuing to build the action for inspection)\n');
  }

  const first = await isFirstAsset();
  if (first === null) {
    console.error('Could not determine whether the dex exists — aborting.\n');
    return false;
  }

  const { address } = await runPreflight();
  const price = await initialPrice(config.oracle.symbol);
  const action = buildRegisterAsset(price, { isFirstAsset: first, oracleUpdater: address });

  console.log(`Initial oracle price: $${action.registerAsset2.assetRequest.oraclePx} (live ${price})`);
  console.log(first ? 'First asset of the dex — sending schema.' : 'Dex exists — schema is null.');
  console.log(`\n${JSON.stringify(action, null, 2)}\n`);

  if (!send) {
    console.log('DRY RUN — nothing was signed or sent. Re-run with --send to deploy.\n');
    return true;
  }

  if (!oracleUpdaterKey) {
    console.error('HIP3_ORACLE_UPDATER_KEY is required to send.\n');
    return false;
  }

  console.log('Sending registerAsset2...\n');
  const hl = await import('@nktkas/hyperliquid');
  const client = new hl.ExchangeClient({
    transport: new hl.HttpTransport({ isTestnet }),
    wallet: privateKeyToAccount(oracleUpdaterKey),
  });

  try {
    const result = await client.perpDeploy(action);
    console.log(`Deployed. ${dex}:${coin} exists.`);
    console.log(`Response: ${JSON.stringify(result)}\n`);
    console.log(`Next: HIP3_ENABLED=true HIP3_DRY_RUN=false npm start\n`);
    return true;
  } catch (err) {
    // The raw message is the point: when the stake requirement is what rejected
    // us, this text is the only authoritative statement of what it actually is.
    console.error(`\nRejected by the API. Raw error:\n\n  ${err.message}\n`);
    if (err.response) console.error(`  response: ${JSON.stringify(err.response)}\n`);
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit((await main()) ? 0 : 1);
}
