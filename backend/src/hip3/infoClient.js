import { config } from '../config.js';

const API_URL = config.hip3.isTestnet
  ? 'https://api.hyperliquid-testnet.xyz/info'
  : 'https://api.hyperliquid.xyz/info';

const TIMEOUT_MS = 10000;
const MAX_TRIES = 5;

/**
 * POSTs an info request, retrying with backoff.
 *
 * The endpoint answers `null` (and an empty body) when it rate-limits, which is
 * indistinguishable from a legitimate `null` payload — `delegatorSummary` returns
 * exactly that for an address that never staked. So callers say which shape they
 * expect: `nullIsAnswer: true` accepts null as data, otherwise null means retry.
 *
 * @param {object} body - the info request, e.g. { type: 'perpDexs' }
 * @param {{ nullIsAnswer?: boolean }} [opts]
 * @returns {Promise<any|undefined>} undefined when every attempt failed
 */
export async function info(body, { nullIsAnswer = false } = {}) {
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    if (attempt > 0) await sleep(600 * attempt);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 429) continue;
      const text = await res.text();
      if (!res.ok) {
        // A non-2xx with a body (e.g. a 500 with an error message) is not a
        // legitimate answer — parsing it as one would let a server error look
        // like real data (a preflight check showing green over a 500).
        continue;
      }
      if (!text) continue;
      const json = JSON.parse(text);
      if (json === null && !nullIsAnswer) continue;
      return json;
    } catch {
      // network error or unparseable body — fall through to the next attempt
    }
  }
  return undefined;
}

export const apiUrl = API_URL;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
