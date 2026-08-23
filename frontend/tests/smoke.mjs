import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOCK_SNAPSHOT } from "../js/mock-data.js";
import { formatMetric, formatUpdated } from "../js/page-data.js";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageFiles = ["index.html", "markets/market.html", "oracle/oracle.html", "infra/infrastructure.html"];

assert.equal(MOCK_SNAPSHOT.mode, "mock");
assert.equal(MOCK_SNAPSHOT.market.data.marketStatus, "LIVE");
assert.equal(MOCK_SNAPSHOT.oracle.data.price, 42.315);
assert.match(formatMetric(42.315), /\$42\.315/);
assert.equal(formatMetric(undefined), "—");
assert.match(formatUpdated(MOCK_SNAPSHOT.fetchedAt), /^updated /);

for (const relativePath of pageFiles) {
  const html = fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");
  assert.match(html, /<main\b/);
  assert.match(html, /<nav\b/);
  assert.match(html, /type="module"/);
  assert.doesNotMatch(html, /<div id="app"/);
  assert.doesNotMatch(html, /window\.AUSTRAL_CONFIG|fetch\(|innerHTML/);
}

const sourceFiles = [];
function collectJavaScript(directory) {
  if (directory === path.join(frontendRoot, "tests")) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectJavaScript(filePath);
    else if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs") || entry.name.endsWith(".cjs")) sourceFiles.push(filePath);
  }
}
collectJavaScript(frontendRoot);
const source = sourceFiles.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");
assert.doesNotMatch(source, /fetch\(|connectWallet|@tetherto\/wdk|from ["'].*(?:api|wallet|blockchain)/i);
assert.doesNotMatch(source, /document\.body\.innerHTML|\.innerHTML\s*=/);

console.log("Frontend-only smoke test passed: real pages, isolated mock data, no integrations.");
