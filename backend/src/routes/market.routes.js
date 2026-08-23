import { getPrice } from '../oracle/index.js';
import { pusherState } from '../pusher/hipPusher.js';
import { publisherState } from '../hip3/publisher.js';
import { info } from '../hip3/infoClient.js';
import { config } from '../config.js';

const MAX_FUNDING = 0.0005; // ±0.05% per interval

// Display name for the market. On HyperCore the identity is the (dex, coin) pair —
// "YPF-PERP" is only what the UI shows.
const MARKET_SYMBOL = `${config.oracle.symbol}-PERP`;

// In HIP-3 leverage comes from the margin table the asset is registered against,
// not from a free parameter. Ids below 50 are HyperCore's built-in tables, where the
// id IS the max leverage — verified on the main dex: 66 assets on table 5 cap at 5x,
// 47 on table 10 cap at 10x, and felix:TSLA (an equity perp) uses 5. Ids >= 50 are
// custom tables inserted per dex, whose tiers have to be read from `meta`.
const BUILTIN_TABLE_MAX = 50;

// Used only when a custom table's tiers cannot be read from `meta` (API
// unreachable) — conservative on purpose, since we cannot verify the real cap.
const CUSTOM_TABLE_LEVERAGE_FALLBACK = 1;

let cachedCustomMaxLeverage = null;
let customMaxLeveragePromise = null;

/**
 * Max leverage for the configured margin table. Ids below 50 are HyperCore
 * built-ins where the id IS the max leverage. Ids >= 50 are custom tables whose
 * tiers must be read from the `marginTable` info endpoint — the first tier (the
 * smallest position size) carries the highest leverage. Never resolves to null:
 * a field the UI interpolates (`${market.maxLeverage}x`) must always be a number.
 */
async function resolveMaxLeverage(marginTableId) {
  if (marginTableId < BUILTIN_TABLE_MAX) return marginTableId;
  if (cachedCustomMaxLeverage !== null) return cachedCustomMaxLeverage;

  if (!customMaxLeveragePromise) {
    customMaxLeveragePromise = info({ type: 'marginTable', id: marginTableId, dex: config.hip3.dex })
      .then((table) => {
        const leverage = table?.marginTiers?.[0]?.maxLeverage;
        cachedCustomMaxLeverage = Number.isFinite(leverage) ? leverage : CUSTOM_TABLE_LEVERAGE_FALLBACK;
        return cachedCustomMaxLeverage;
      })
      .catch(() => {
        cachedCustomMaxLeverage = CUSTOM_TABLE_LEVERAGE_FALLBACK;
        return cachedCustomMaxLeverage;
      })
      .finally(() => {
        customMaxLeveragePromise = null;
      });
  }
  return customMaxLeveragePromise;
}

export async function marketRoutes(fastify) {
  fastify.get('/market/:symbol', async (req, reply) => {
    const { symbol } = req.params;

    if (symbol.toUpperCase() !== MARKET_SYMBOL) {
      return reply.code(404).send({ error: `Market ${symbol} not found` });
    }

    let oracle;
    try {
      oracle = getPrice();
    } catch {
      return reply.code(503).send({ error: 'Oracle not ready yet' });
    }

    // The oracle already applied the breaker, so oracle.price IS the mark.
    // The index is the untouched print, which is what makes the two differ.
    const markPrice = oracle.price;
    const indexPrice = oracle.lastPrint ?? oracle.price;
    const { lastPushTx, lastPushAt } = pusherState();
    const hip3 = publisherState();

    return {
      symbol: MARKET_SYMBOL,
      markPrice,
      indexPrice,
      fundingRate: oracle.marketOpen ? fundingFrom(markPrice, indexPrice) : 0,
      maxLeverage: await resolveMaxLeverage(config.hip3.marginTableId),
      marketStatus: marketStatusFrom(hip3, lastPushAt),
      hip3: {
        market: hip3.market,
        publishing: hip3.publishing,
        dryRun: hip3.dryRun,
        lastPublishAt: hip3.lastPublishAt,
      },
      oracleStatus: oracle.status,
      oracleSource: oracle.source,
      simulated: oracle.simulated ?? false,
      lastPushTx: lastPushTx ?? null,
      lastPushAt,
    };
  });
}

/**
 * 'live' only when prices are actually reaching HyperCore. A dry run — or the EVM
 * mirror alone — is a rehearsal, and the frontend badge says so.
 */
function marketStatusFrom(hip3, lastPushAt) {
  if (hip3.publishing && !hip3.dryRun) return 'live';
  if (hip3.publishing || lastPushAt > 0) return 'rehearsal';
  return 'offline';
}

/**
 * Premium of mark over index, clamped — a placeholder, not a real funding calc.
 * Only meaningful while the venue is open: out of hours the mark is the EMA and the
 * index is the last print, so the gap is EMA lag rather than a premium, and it would
 * sit pinned at the clamp all night.
 */
function fundingFrom(mark, index) {
  if (!Number.isFinite(mark) || !Number.isFinite(index) || index <= 0) return 0;
  const premium = (mark - index) / index;
  const clamped = Math.max(-MAX_FUNDING, Math.min(MAX_FUNDING, premium));
  return Math.round(clamped * 1_000_000) / 1_000_000;
}
