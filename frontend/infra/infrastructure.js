import { emptyNotice } from "../js/components/common.js";
import { getConfig } from "../js/api/config.js";
import { loadPageSnapshot } from "../js/state.js";
import { escapeHTML, isAvailable, modeBadge, readableStatus, statusBadge } from "../js/utils/format.js";
import { wireGlobalUI } from "../js/app.js";
import { parseRpcHex, shortenHex, sameAddress, resolveContractStatus, resolveReceiptStatus, resolveRpcStatus } from "./onchain-utils.js";
import { DEPLOYMENT_METADATA } from "./onchain-data.js";

const page = document.querySelector('[data-page="infrastructure"]');

function setHTML(selector, html) {
  const element = page?.querySelector(selector);
  if (element) element.innerHTML = html;
  return element;
}

function setText(selector, value) {
  const element = page?.querySelector(selector);
  if (element) element.textContent = value;
  return element;
}

function setDocumentHTML(selector, html) {
  const element = document.querySelector(selector);
  if (element) element.innerHTML = html;
  return element;
}

function setDocumentText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
  return element;
}

function formatNumber(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US").format(value) : "—";
}

function createMetadataState() {
  return {
    rpcStatus: "UNAVAILABLE",
    rpcNote: "Deployment metadata",
    chainId: DEPLOYMENT_METADATA.chainId,
    latestBlock: undefined,
    deploymentBlock: DEPLOYMENT_METADATA.deploymentBlock,
    deploymentStatus: "SUCCESS",
    contracts: Object.fromEntries(DEPLOYMENT_METADATA.contracts.map((contract) => [contract.key, {
      ...contract,
      block: DEPLOYMENT_METADATA.deploymentBlock,
      status: "DEPLOYED",
      origin: "deployment metadata",
    }])),
    transactions: Object.fromEntries(DEPLOYMENT_METADATA.transactions.map((transaction) => [transaction.key, {
      ...transaction,
      status: "SUCCESS",
      block: DEPLOYMENT_METADATA.deploymentBlock,
      origin: "deployment metadata",
    }])),
  };
}

async function rpcCall(method, params) {
  const { RPC_URL, RPC_TIMEOUT_MS } = getConfig();
  if (!RPC_URL) throw new Error("RPC URL is not configured");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || "RPC error");
    return payload.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function safeRpcCall(method, params) {
  try {
    return await rpcCall(method, params);
  } catch {
    return null;
  }
}

async function verifyContract(contract, rpcConnected) {
  const [code, receipt, transaction] = await Promise.all([
    safeRpcCall("eth_getCode", [contract.address, "latest"]),
    safeRpcCall("eth_getTransactionReceipt", [contract.transaction]),
    safeRpcCall("eth_getTransactionByHash", [contract.transaction]),
  ]);
  const anyRpcResponse = code !== null || receipt !== null || transaction !== null;
  const codeExists = typeof code === "string" && code.length > 2 && code !== "0x";
  const receiptAddress = receipt?.contractAddress;
  const receiptMatches = sameAddress(receiptAddress, contract.address);
  const receiptSucceeded = receipt?.status === "0x1";
  const verified = codeExists || receiptMatches || (receiptSucceeded && !receiptAddress);
  return {
    ...contract,
    address: contract.address,
    block: parseRpcHex(receipt?.blockNumber) ?? contract.block ?? DEPLOYMENT_METADATA.deploymentBlock,
    status: resolveContractStatus({ code, receipt, rpcConnected, expectedAddress: contract.address }),
    origin: verified ? "RPC verified" : anyRpcResponse ? "RPC checked" : "deployment metadata",
  };
}

async function verifyTransaction(transaction, rpcConnected) {
  const receipt = await safeRpcCall("eth_getTransactionReceipt", [transaction.hash]);
  const status = resolveReceiptStatus(receipt, rpcConnected);
  return {
    ...transaction,
    status,
    block: parseRpcHex(receipt?.blockNumber) ?? DEPLOYMENT_METADATA.deploymentBlock,
    origin: receipt ? "RPC verified" : "deployment metadata",
  };
}

async function readOnChainState() {
  const metadataState = createMetadataState();
  const [chainIdHex, latestBlockHex] = await Promise.all([
    safeRpcCall("eth_chainId", []),
    safeRpcCall("eth_blockNumber", []),
  ]);
  const chainId = parseRpcHex(chainIdHex);
  const latestBlock = parseRpcHex(latestBlockHex);
  const rpcStatus = resolveRpcStatus({ chainId, latestBlock, expectedChainId: DEPLOYMENT_METADATA.chainId });
  const rpcReachable = rpcStatus !== "UNAVAILABLE";
  const rpcConnected = rpcStatus === "CONNECTED";
  const [contractValues, transactionValues] = await Promise.all([
    Promise.all(DEPLOYMENT_METADATA.contracts.map((contract) => verifyContract({ ...contract, block: DEPLOYMENT_METADATA.deploymentBlock }, rpcConnected))),
    Promise.all(DEPLOYMENT_METADATA.transactions.map((transaction) => verifyTransaction(transaction, rpcConnected))),
  ]);
  const contracts = Object.fromEntries(contractValues.map((contract) => [contract.key, contract]));
  const transactions = Object.fromEntries(transactionValues.map((transaction) => [transaction.key, transaction]));
  const transactionStatuses = Object.values(transactions).map((transaction) => transaction.status);
  return {
    ...metadataState,
    rpcStatus,
    rpcNote: !rpcReachable ? "RPC unavailable · deployment metadata shown" : rpcConnected ? "RPC verified" : `RPC chain mismatch · expected ${DEPLOYMENT_METADATA.chainId}, got ${chainId}` ,
    chainId: chainId ?? metadataState.chainId,
    latestBlock,
    contracts,
    transactions,
    deploymentBlock: contracts.ypfOracle?.block ?? metadataState.deploymentBlock,
    deploymentStatus: transactionStatuses.includes("ERROR") ? "ERROR" : "SUCCESS",
  };
}

function renderSystem(snapshot) {
  const demoMode = snapshot.mode === "simulated";
  const healthResource = snapshot.health;
  const healthStatus = healthResource.status === "success" ? String(healthResource.data?.status || "").toLowerCase() === "ok" ? "CONNECTED" : healthResource.data?.status : "UNAVAILABLE";
  setDocumentHTML("[data-system-status]", demoMode ? modeBadge(true, true) : statusBadge(healthStatus, { label: readableStatus(healthStatus), pulse: healthStatus === "CONNECTED" }));
  const refreshedAt = snapshot.lastRefresh || snapshot.fetchedAt;
  setDocumentText("[data-system-note]", demoMode ? "Read-only preview" : refreshedAt ? `Last refresh ${new Date(refreshedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "");
  setDocumentText("[data-updated]", snapshot.fetchedAt ? `updated ${new Date(snapshot.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "");
}

function renderInfrastructure(snapshot, chainState) {
  const demoMode = snapshot.mode === "simulated";
  const { health, oracle, market } = snapshot;
  const healthData = health.data || {};
  const oracleData = oracle.data || {};
  const marketData = market.data || {};
  const healthOracle = healthData.oracle || {};
  const healthHip3 = healthData.hip3 || {};
  const statuses = {
    source: oracle.status === "success" && isAvailable(oracleData.source) ? "CONNECTED" : isAvailable(healthOracle.source) ? "CONNECTED" : "UNAVAILABLE",
    engine: oracle.status === "success" && isAvailable(oracleData.status) ? oracleData.status : isAvailable(healthOracle.status) ? healthOracle.status : "UNAVAILABLE",
    hip: isAvailable(marketData.hip3?.status) ? marketData.hip3.status : isAvailable(healthHip3.status) ? healthHip3.status : healthHip3.enabled === true ? "ENABLED" : "UNAVAILABLE",
    core: isAvailable(marketData.hyperCoreStatus) ? marketData.hyperCoreStatus : "UNAVAILABLE",
    evm: chainState?.contracts?.ypfOracle?.status || "DEPLOYED",
  };
  const hasAnyReal = Object.values(statuses).some((value) => value !== "UNAVAILABLE");

  renderSystem(snapshot);
  setHTML("[data-page-mode]", modeBadge(hasAnyReal, demoMode));
  setHTML("[data-page-status]", statusBadge(hasAnyReal ? "CONNECTED" : "UNAVAILABLE", { label: hasAnyReal ? "Partial system map" : "Unavailable" }));
  const notice = page?.querySelector("[data-infra-notice]");
  if (notice) {
    const content = demoMode ? "Presentation preview: infrastructure map is read-only." : chainState?.rpcStatus === "UNAVAILABLE" ? "RPC unavailable · deployment metadata shown." : "";
    notice.innerHTML = content ? emptyNotice(content, "warning") : "";
    notice.hidden = !content;
  }

  Object.entries(statuses).forEach(([key, value]) => {
    setHTML(`[data-infra-status="${key}"]`, statusBadge(value, { label: readableStatus(value) }));
    const origin = key === "evm" ? chainState?.contracts?.ypfOracle?.origin : value === "UNAVAILABLE" ? "—" : demoMode ? "fixture" : "backend";
    setText(`[data-infra-origin="${key}"]`, value === "UNAVAILABLE" ? "—" : origin || "backend");
  });
  const evmContract = chainState?.contracts?.ypfOracle;
  setText("[data-infra-card-network]", DEPLOYMENT_METADATA.network);
  setText("[data-infra-card-chain-id]", String(chainState?.chainId ?? DEPLOYMENT_METADATA.chainId));
  setText("[data-infra-card-contract]", evmContract?.address || DEPLOYMENT_METADATA.contracts[0].address);
  setText("[data-infra-card-block]", formatNumber(evmContract?.block ?? DEPLOYMENT_METADATA.deploymentBlock));
}

function renderOnChainState(chainState) {
  setHTML("[data-rpc-status]", statusBadge(chainState.rpcStatus, { label: readableStatus(chainState.rpcStatus), pulse: chainState.rpcStatus === "CONNECTED" }));
  setHTML("[data-deployment-status]", statusBadge(chainState.deploymentStatus, { label: readableStatus(chainState.deploymentStatus) }));
  setText("[data-rpc-note]", chainState.rpcNote);
  setText("[data-chain-network]", DEPLOYMENT_METADATA.network);
  setText("[data-chain-id]", String(chainState.chainId ?? DEPLOYMENT_METADATA.chainId));
  setText("[data-latest-block]", formatNumber(chainState.latestBlock));
  setText("[data-deployment-block]", formatNumber(chainState.deploymentBlock));
  setText("[data-deployer]", `${DEPLOYMENT_METADATA.deployer.slice(0, 6)}…${DEPLOYMENT_METADATA.deployer.slice(-5)}`);
  setText("[data-market]", DEPLOYMENT_METADATA.market);
  setText("[data-underlying]", DEPLOYMENT_METADATA.underlying);
  setText("[data-max-leverage]", DEPLOYMENT_METADATA.maxLeverage);
  setText("[data-deployment-cost]", DEPLOYMENT_METADATA.totalCost);
  setText("[data-deployment-gas]", DEPLOYMENT_METADATA.gas);
  setText("[data-deployment-gas-price]", DEPLOYMENT_METADATA.averageGasPrice);
  setCopyValue("[data-deployer-copy]", DEPLOYMENT_METADATA.deployer);

  DEPLOYMENT_METADATA.contracts.forEach((metadataContract) => {
    const contract = chainState.contracts?.[metadataContract.key] || metadataContract;
    setHTML(`[data-deployment-status="${metadataContract.key}"]`, statusBadge(contract.status, { label: readableStatus(contract.status) }));
    setText(`[data-deployment-address="${metadataContract.key}"]`, contract.address);
    setText(`[data-deployment-block="${metadataContract.key}"]`, formatNumber(contract.block));
    setText(`[data-deployment-transaction="${metadataContract.key}"]`, shortenHex(contract.transaction));
    setCopyValue(`[data-deployment-copy="${metadataContract.key}"]`, contract.address);
    const transactionButton = page?.querySelector(`[data-deployment-tx-copy="${metadataContract.key}"]`);
    if (transactionButton) {
      transactionButton.dataset.copyValue = contract.transaction;
      transactionButton.title = contract.transaction;
    }
    setText(`[data-deployment-origin="${metadataContract.key}"]`, contract.origin);
  });

  const transactions = page?.querySelector("[data-deployment-transactions]");
  if (transactions) {
    transactions.innerHTML = DEPLOYMENT_METADATA.transactions.map((metadataTransaction) => {
      const transaction = chainState.transactions?.[metadataTransaction.key] || metadataTransaction;
      const status = statusBadge(transaction.status, { label: readableStatus(transaction.status) });
      return `<article class="deployment-transaction"><div><span class="deployment-transaction__label">${escapeHTML(transaction.label)}</span><code title="${escapeHTML(transaction.hash)}">${escapeHTML(shortenHex(transaction.hash))}</code></div><div class="deployment-transaction__meta"><span>${escapeHTML(transaction.origin)}</span>${status}</div><button class="deployment-copy deployment-copy--hash" type="button" data-copy-value="${escapeHTML(transaction.hash)}" title="${escapeHTML(transaction.hash)}">Copy hash</button></article>`;
    }).join("");
    bindCopyControls(transactions);
  }
}

function setCopyValue(selector, value) {
  const element = page?.querySelector(selector);
  if (!element || !value) return;
  element.dataset.copyValue = value;
  element.title = value;
}

async function copyValue(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

function bindCopyControls(root = page) {
  root?.querySelectorAll("[data-copy-value]").forEach((button) => {
    if (button.dataset.copyBound === "true") return;
    button.dataset.copyBound = "true";
    button.addEventListener("click", async () => {
      const value = button.dataset.copyValue;
      if (!value) return;
      try {
        await copyValue(value);
        button.dataset.copyState = "copied";
        const original = button.dataset.copyLabel || button.textContent;
        button.dataset.copyLabel = original;
        if (button.classList.contains("deployment-copy--hash")) button.textContent = "Copied";
        setTimeout(() => {
          button.dataset.copyState = "";
          if (button.classList.contains("deployment-copy--hash")) button.textContent = original;
        }, 1200);
      } catch {
        button.title = value;
      }
    });
  });
}

wireGlobalUI(document);
bindCopyControls();
loadPageSnapshot().then(async (snapshot) => {
  let chainState = createMetadataState();
  renderInfrastructure(snapshot, chainState);
  renderOnChainState(chainState);
  if (snapshot.mode !== "simulated") {
    chainState = await readOnChainState();
    renderInfrastructure(snapshot, chainState);
    renderOnChainState(chainState);
  }
});

export { DEPLOYMENT_METADATA };
