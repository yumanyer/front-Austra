import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// config.js resolves the environment once at import time, so each case needs a
// fresh module instance — a distinct query string bypasses the ESM cache.
let counter = 0;
const saved = { ...process.env };

async function loadWith(env) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  return import(`../src/config.js?case=${counter++}`);
}

afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
});

test('defaults resolve without any environment', async () => {
  const { config, configErrors } = await loadWith({});
  assert.deepEqual(configErrors, []);
  assert.equal(config.port, 3000);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.oracle.emaAlpha, 0.2);
  assert.equal(config.oracle.breakerReleaseTicks, 3);
  assert.equal(config.data912.baseUrl, 'https://data912.com');
});

test('valid overrides are applied', async () => {
  const { config, configErrors } = await loadWith({ HOST: '127.0.0.1', PORT: '4000', ORACLE_EMA_ALPHA: '0.5', ORACLE_SIMULATED_WALK: 'true' });
  assert.deepEqual(configErrors, []);
  assert.equal(config.port, 4000);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.oracle.emaAlpha, 0.5);
  assert.equal(config.oracle.simulatedWalk, true);
});

test('a non-numeric integer is rejected and falls back', async () => {
  const { config, configErrors } = await loadWith({ PORT: 'abc' });
  assert.equal(config.port, 3000);
  assert.match(configErrors.join('\n'), /^PORT="abc" is not an integer/m);
});

test('alpha outside (0, 1] is rejected', async () => {
  const zero = await loadWith({ ORACLE_EMA_ALPHA: '0' });
  assert.equal(zero.configErrors.length, 1);
  assert.equal(zero.config.oracle.emaAlpha, 0.2);

  const over = await loadWith({ ORACLE_EMA_ALPHA: '1.5' });
  assert.equal(over.configErrors.length, 1);

  const one = await loadWith({ ORACLE_EMA_ALPHA: '1' });
  assert.deepEqual(one.configErrors, []);
  assert.equal(one.config.oracle.emaAlpha, 1);
});

test('a poll interval below the upstream cache floor is rejected', async () => {
  const { configErrors } = await loadWith({ ORACLE_POLL_INTERVAL_MS: '100' });
  assert.match(configErrors.join(), /ORACLE_POLL_INTERVAL_MS/);
});

test('booleans only accept true/false', async () => {
  const { config, configErrors } = await loadWith({ ORACLE_SIMULATED_WALK: 'yes' });
  assert.equal(config.oracle.simulatedWalk, false);
  assert.match(configErrors.join(), /must be "true" or "false"/);
});

test('a malformed URL is rejected and a trailing slash is stripped', async () => {
  const bad = await loadWith({ DATA912_BASE_URL: 'not-a-url' });
  assert.equal(bad.config.data912.baseUrl, 'https://data912.com');
  assert.match(bad.configErrors.join(), /DATA912_BASE_URL/);

  const slash = await loadWith({ DATA912_BASE_URL: 'http://localhost:4599/' });
  assert.deepEqual(slash.configErrors, []);
  assert.equal(slash.config.data912.baseUrl, 'http://localhost:4599');
});

test('the pusher needs both a well-formed address and key', async () => {
  const address = `0x${'ab'.repeat(20)}`;
  const key = `0x${'cd'.repeat(32)}`;

  const short = await loadWith({ ORACLE_CONTRACT_ADDRESS: '0x1234' });
  assert.equal(short.config.pusher.contractAddress, null);
  assert.equal(short.config.pusher.enabled, false);
  assert.match(short.configErrors.join(), /ORACLE_CONTRACT_ADDRESS is not a 0x-prefixed 20-byte hex/);

  const addressOnly = await loadWith({ ORACLE_CONTRACT_ADDRESS: address });
  assert.deepEqual(addressOnly.configErrors, []);
  assert.equal(addressOnly.config.pusher.enabled, false); // no key yet

  const both = await loadWith({ ORACLE_CONTRACT_ADDRESS: address, PUSHER_PRIVATE_KEY: key });
  assert.deepEqual(both.configErrors, []);
  assert.equal(both.config.pusher.enabled, true);
});

test('the HIP-3 dex name must be 2-4 lowercase letters', async () => {
  const bad = await loadWith({ HIP3_DEX: 'GGAL-PERP' });
  assert.equal(bad.config.hip3.dex, 'arg');
  assert.match(bad.configErrors.join(), /HIP3_DEX="GGAL-PERP" must be 2-4 lowercase letters/);

  const tooLong = await loadWith({ HIP3_DEX: 'austral' });
  assert.equal(tooLong.configErrors.length, 1);

  const ok = await loadWith({ HIP3_DEX: 'arg' });
  assert.deepEqual(ok.configErrors, []);
});

test('the publish interval cannot go below the 2.5s HyperCore floor', async () => {
  const { configErrors } = await loadWith({ HIP3_PUBLISH_INTERVAL_MS: '1000' });
  assert.match(configErrors.join(), /HIP3_PUBLISH_INTERVAL_MS/);

  const ok = await loadWith({ HIP3_PUBLISH_INTERVAL_MS: '2500' });
  assert.deepEqual(ok.configErrors, []);
});

test('publishing for real requires an oracle updater key', async () => {
  const noKey = await loadWith({ HIP3_ENABLED: 'true', HIP3_DRY_RUN: 'false' });
  assert.match(noKey.configErrors.join(), /requires HIP3_ORACLE_UPDATER_KEY/);

  // A dry run needs no key — that is the point of it.
  const dry = await loadWith({ HIP3_ENABLED: 'true', HIP3_DRY_RUN: 'true' });
  assert.deepEqual(dry.configErrors, []);

  const withKey = await loadWith({ HIP3_ENABLED: 'true', HIP3_DRY_RUN: 'false', HIP3_ORACLE_UPDATER_KEY: `0x${'cd'.repeat(32)}` });
  assert.deepEqual(withKey.configErrors, []);
});

test('the margin mode is restricted to the three HyperCore values', async () => {
  const bad = await loadWith({ HIP3_MARGIN_MODE: 'isolated' });
  assert.equal(bad.config.hip3.marginMode, 'strictIsolated');
  assert.match(bad.configErrors.join(), /HIP3_MARGIN_MODE="isolated" must be strictIsolated, noCross or normal/);

  for (const mode of ['strictIsolated', 'noCross', 'normal']) {
    const ok = await loadWith({ HIP3_MARGIN_MODE: mode });
    assert.deepEqual(ok.configErrors, []);
    assert.equal(ok.config.hip3.marginMode, mode);
  }
});

test('the ADR and local tickers are separate symbols', async () => {
  const { config } = await loadWith({});
  assert.equal(config.oracle.symbol, 'YPF');
  assert.equal(config.oracle.localSymbol, 'YPFD');

  // Both are upper-cased, so a lowercase .env entry still matches the feed.
  const lower = await loadWith({ ORACLE_SYMBOL: 'ypf', ORACLE_LOCAL_SYMBOL: 'ypfd' });
  assert.equal(lower.config.oracle.symbol, 'YPF');
  assert.equal(lower.config.oracle.localSymbol, 'YPFD');
});
test('describeConfig redacts the private key', async () => {
  const key = `0x${'cd'.repeat(32)}`;
  const { describeConfig } = await loadWith({ ORACLE_CONTRACT_ADDRESS: `0x${'ab'.repeat(20)}`, PUSHER_PRIVATE_KEY: key });
  const described = describeConfig();
  assert.equal(described.pusher.privateKey, '<set>');
  const hip3 = await loadWith({ HIP3_ORACLE_UPDATER_KEY: key });
  assert.equal(hip3.describeConfig().hip3.oracleUpdaterKey, '<set>');
  assert.equal(JSON.stringify(described).includes(key.slice(2)), false);
});

test('the config object is deeply frozen', async () => {
  const { config } = await loadWith({});
  assert.throws(() => { config.oracle.emaAlpha = 0.9; }, TypeError);
  assert.equal(config.oracle.emaAlpha, 0.2);
});
