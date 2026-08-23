import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRegisterAsset } from '../src/hip3/deployer.js';

// Defaults: HIP3_DEX=arg, HIP3_COIN=YPF, HIP3_SZ_DECIMALS=2,
// HIP3_MARGIN_TABLE_ID=5, HIP3_MARGIN_MODE=strictIsolated, collateralToken=0
const UPDATER = `0x${'ab'.repeat(20)}`;

test('the action registers the configured asset on the configured dex', () => {
  const { registerAsset2: a } = buildRegisterAsset(50.298001, { oracleUpdater: UPDATER });
  assert.equal(a.dex, 'arg');
  assert.equal(a.assetRequest.coin, 'arg:YPF'); // qualified, not the bare ticker
  assert.equal(a.assetRequest.szDecimals, 2);
  assert.equal(a.assetRequest.marginTableId, 5);
  assert.equal(a.assetRequest.marginMode, 'strictIsolated');
  assert.equal(a.maxGas, null); // the first 3 assets of a new dex skip the auction
});

test('the initial price is formatted to tick rules, as a string', () => {
  const px = (p) => buildRegisterAsset(p).registerAsset2.assetRequest.oraclePx;
  assert.equal(px(50.298001), '50.298');      // szDecimals 2 -> max 4 decimals
  assert.equal(px(51.25), '51.25');
  assert.equal(px(1234.5678), '1234.5');      // capped at 5 significant figures
  assert.equal(px(8150), '8150');             // integers are exempt from the cap
  assert.equal(typeof px(51.25), 'string');
});

test('the schema is sent only for the first asset of a dex', () => {
  const first = buildRegisterAsset(51.25, { isFirstAsset: true, oracleUpdater: UPDATER });
  assert.deepEqual(first.registerAsset2.schema, {
    fullName: 'austral.fi Argentine Markets',
    collateralToken: 0,
    oracleUpdater: UPDATER,
  });

  // Adding a second asset (I.SOJA later on) must pass null, or HyperCore rejects it.
  const second = buildRegisterAsset(51.25, { isFirstAsset: false, oracleUpdater: UPDATER });
  assert.equal(second.registerAsset2.schema, null);
});

test('the oracle updater defaults to null rather than undefined', () => {
  // undefined would be dropped by JSON.stringify and the field would vanish.
  const { registerAsset2: a } = buildRegisterAsset(51.25);
  assert.equal(a.schema.oracleUpdater, null);
  assert.ok('oracleUpdater' in a.schema);
});

test('an unusable initial price is rejected rather than sent', () => {
  assert.throws(() => buildRegisterAsset(0), /truncated to 0/);
  assert.throws(() => buildRegisterAsset(NaN), /not finite/);
  assert.throws(() => buildRegisterAsset(Infinity), /not finite/);
});
