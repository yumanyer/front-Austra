import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Copies the ABI of a compiled contract from Foundry's build artifacts into abi/,
// keeping the backend's view of the contract in sync after every build.
//
// Usage: node script/sync-abi.mjs [ContractName]   (default: YPFOracle)

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2] ?? 'YPFOracle';

const artifactPath = join(root, 'out', `${name}.sol`, `${name}.json`);
if (!existsSync(artifactPath)) {
  console.error(`[sync-abi] Artifact not found for "${name}" at ${artifactPath}`);
  console.error('[sync-abi] Run "forge build" first (or check the contract name).');
  process.exit(1);
}

const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
if (!Array.isArray(artifact.abi) || artifact.abi.length === 0) {
  console.error(`[sync-abi] No ABI entries in ${artifactPath}`);
  process.exit(1);
}

const abiPath = join(root, 'abi', `${name}.json`);
mkdirSync(dirname(abiPath), { recursive: true });
writeFileSync(abiPath, `${JSON.stringify(artifact.abi, null, 2)}\n`);
console.log(`[sync-abi] ${name} ABI synced -> ${abiPath}`);
