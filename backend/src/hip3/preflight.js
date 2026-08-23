import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config.js';
import { info, apiUrl } from './infoClient.js';

const { dex, coin, marginTableId, collateralToken, minStakeHype, oracleUpdaterKey, isTestnet } = config.hip3;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

/**
 * Read-only checks that answer "can we register this market, and if not, what is
 * missing?" — nothing here signs or sends anything.
 *
 * A check's `ok` is `true`/`false` when it gates the deploy, or `null` when it is
 * informational (or when the API could not be reached, which is not a failure of
 * the thing being checked).
 *
 * @returns {Promise<{ ok: boolean, checks: Array<{label: string, ok: boolean|null, detail: string}>, address: string|null, stake: number|null }>}
 */
export async function runPreflight() {
  const checks = [];
  const add = (label, ok, detail) => checks.push({ label, ok, detail });

  // ── the signing identity ────────────────────────────────────────────────
  let address = null;
  if (!oracleUpdaterKey) {
    add('Oracle updater key', false, 'HIP3_ORACLE_UPDATER_KEY is not set');
  } else {
    address = privateKeyToAccount(oracleUpdaterKey).address;
    add('Oracle updater key', true, address);
  }

  // ── staking balance ─────────────────────────────────────────────────────
  // Measured against the staking balance, not against what is delegated to a
  // validator: several live-dex deployers sit at delegated 0 with a positive
  // balance, so delegation is clearly not what is checked.
  let stake = null;
  if (address) {
    const summary = await info({ type: 'delegatorSummary', user: address }, { nullIsAnswer: true });
    if (summary === undefined) {
      add('Staking balance', null, 'could not reach the API');
    } else {
      // null means the address never had a staking balance at all.
      stake = summary === null
        ? 0
        : num(summary.delegated) + num(summary.undelegated) + num(summary.totalPendingWithdrawal);
      // Informational, deliberately NOT blocking: the floor is inferred from the
      // 244 live-dex deployers on testnet (240 hold >= 100, clustered at exactly
      // 100.0000), not from any documentation. Blocking on a guess would stop us
      // from asking the only authority there is — so let the deploy attempt run
      // and let HyperCore state the requirement itself.
      const enough = stake >= minStakeHype;
      add('Staking balance', enough ? true : null,
        enough
          ? `${stake} HYPE (>= ${minStakeHype})`
          : `${stake} HYPE — ${round(minStakeHype - stake)} below the *assumed* ${minStakeHype} `
            + '(inferred, not documented — the deploy attempt is what confirms it)');
    }
  }

  // ── is the wallet known to HyperCore at all? ────────────────────────────
  // An address with no balance anywhere cannot sign exchange actions: it comes
  // back as "User or API Wallet does not exist".
  if (address) {
    const [perp, spot] = await Promise.all([
      info({ type: 'clearinghouseState', user: address }),
      info({ type: 'spotClearinghouseState', user: address }),
    ]);
    const perpValue = num(perp?.marginSummary?.accountValue);
    const balances = (spot?.balances ?? []).filter((b) => num(b.total) > 0);
    const funded = perpValue > 0 || balances.length > 0 || stake > 0;
    add('Known to HyperCore', funded,
      funded
        ? `perp $${perpValue}, spot: ${balances.map((b) => `${b.total} ${b.coin}`).join(', ') || 'empty'}`
        : 'no balance anywhere — bridge HYPE to 0x2222...2222 on HyperEVM first');
  }

  // ── the dex name ────────────────────────────────────────────────────────
  const dexs = await info({ type: 'perpDexs' });
  if (dexs === undefined) {
    add(`Dex name "${dex}"`, null, 'could not reach the API');
  } else {
    const live = dexs.filter(Boolean);
    const taken = live.find((d) => d.name === dex);
    add(`Dex name "${dex}"`, !taken,
      taken ? `already deployed by ${taken.deployer}` : `free (${live.length} dexs exist)`);
  }

  // ── the shortfall, priced ───────────────────────────────────────────────
  if (stake !== null && stake < minStakeHype) {
    const ask = await hypeAsk();
    add('Cost of the shortfall', null,
      ask === null
        ? 'could not price HYPE on the spot book'
        : `${round(minStakeHype - stake)} HYPE ~ ${round((minStakeHype - stake) * ask)} mock USDC `
          + `(HYPE ask $${ask}; the USDC faucet gives 1000 per claim every 4h)`);
  }

  // ── asset parameters ────────────────────────────────────────────────────
  // Margin table ids below 50 are HyperCore built-ins where the id IS the max
  // leverage (verified: 66 main-dex assets on table 5 cap at 5x). Ids >= 50 are
  // custom tables that must have been inserted on the target dex.
  const builtinTable = marginTableId < 50;
  add('Margin table', builtinTable ? true : null,
    builtinTable
      ? `id ${marginTableId} -> ${marginTableId}x (built-in)`
      : `id ${marginTableId} is a custom table — confirm it exists on "${dex}"`);

  const spotMeta = await info({ type: 'spotMeta' });
  if (spotMeta === undefined) {
    add('Collateral token', null, 'could not reach the API');
  } else {
    const token = spotMeta.tokens.find((t) => t.index === collateralToken);
    add('Collateral token', Boolean(token),
      token ? `index ${collateralToken} = ${token.name}` : `index ${collateralToken} not found`);
  }

  // ── the deploy auction (informational) ──────────────────────────────────
  const auction = await info({ type: 'perpDeployAuctionStatus' });
  add('Deploy auction', null,
    auction === undefined
      ? 'could not reach the API'
      : `current gas ${auction.currentGas ?? auction.startGas} — the first 3 assets of a new dex are exempt`);

  return { ok: checks.every((c) => c.ok !== false), checks, address, stake };
}

/** Best ask for HYPE on the spot book, discovering the pair instead of hardcoding it. */
async function hypeAsk() {
  const meta = await info({ type: 'spotMeta' });
  if (!meta) return null;
  const indexOf = (name) => meta.tokens.find((t) => t.name === name)?.index;
  const [hype, usdc] = [indexOf('HYPE'), indexOf('USDC')];
  const pair = meta.universe.find((p) => p.tokens[0] === hype && p.tokens[1] === usdc);
  if (!pair) return null;
  const book = await info({ type: 'l2Book', coin: pair.name });
  const ask = book?.levels?.[1]?.[0]?.px;
  return ask === undefined ? null : num(ask);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/** Renders the checklist. Returns true when nothing blocks the deploy. */
export async function main() {
  console.log(`\nHIP-3 preflight — ${dex}:${coin} on ${isTestnet ? 'testnet' : 'MAINNET'}`);
  console.log(`${apiUrl}\n`);

  const { ok, checks } = await runPreflight();
  for (const { label, ok: pass, detail } of checks) {
    const mark = pass === true ? `${GREEN}OK${RESET}  ` : pass === false ? `${RED}FAIL${RESET}` : `${YELLOW}--${RESET}  `;
    console.log(`  ${mark}  ${label.padEnd(22)} ${detail}`);
  }
  console.log(ok ? '\nNothing blocking — ready to deploy.\n' : '\nBlocked — see the FAIL rows above.\n');
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit((await main()) ? 0 : 1);
}
