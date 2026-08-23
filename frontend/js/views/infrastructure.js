import { isAvailable, modeBadge, readableStatus, statusBadge } from "../utils.js";
import { emptyNotice, icon, pageHeader, sectionHeader } from "../components/common.js";

function infrastructureCard({ className, title, tag, status, items, footer, demoMode = false }) {
  return `<article class="infra-card ${className || ""}"><div class="infra-card__top"><div><h2>${title}</h2><p class="infra-card__tag">${tag}</p></div>${statusBadge(status, { label: readableStatus(status) })}</div><ul class="infra-card__list">${items.map((item) => `<li>${item}</li>`).join("")}</ul><div class="infra-card__footer"><span>${footer || "Status source"}</span><span>${status === "UNAVAILABLE" ? "—" : demoMode ? "fixture" : "backend"}</span></div></article>`;
}

function renderDiagram() {
  return `<section class="surface infra-diagram" aria-labelledby="architecture-title">
    ${sectionHeader("Architecture map", "The Oracle Engine publishes to two independent on-chain destinations")}
    <div class="infra-diagram__body">
      <div class="diagram-canvas" id="architecture-title">
        <div class="diagram-node diagram-node--root"><div><strong>AUSTRAL.FI</strong><span>product layer</span></div></div>
        <div class="diagram-node diagram-node--engine"><div><strong>ORACLE ENGINE</strong><span>price publication</span></div></div>
        <div class="diagram-node diagram-node--hip"><div><strong>HIP-3</strong><span>arg / publisher</span></div></div>
        <div class="diagram-node diagram-node--core"><div><strong>HYPERCORE</strong><span>YPF-PERP</span></div></div>
        <div class="diagram-node diagram-node--asset"><div><strong>ASSETORACLE</strong><span>price mirror</span></div></div>
        <div class="diagram-node diagram-node--evm"><div><strong>HYPEREVM</strong><span>auditable mirror</span></div></div>
        <span class="diagram-connector diagram-connector--root" aria-hidden="true"></span>
        <span class="diagram-connector diagram-connector--left diagram-connector--arrow-left" aria-hidden="true"></span>
        <span class="diagram-connector diagram-connector--right diagram-connector--arrow-right" aria-hidden="true"></span>
        <span class="diagram-connector diagram-connector--core" aria-hidden="true"></span>
        <span class="diagram-connector diagram-connector--evm" aria-hidden="true"></span>
      </div>
      <p class="diagram-caption">AssetOracle is an auditable HyperEVM mirror. It is not represented as the direct feed consumed by HyperCore.</p>
    </div>
  </section>`;
}

export function renderInfrastructure(state) {
  const demoMode = state.snapshot.mode === "simulated";
  const { oracle, market } = state.snapshot;
  const oracleData = oracle.data || {};
  const marketData = market.data || {};
  const oracleRaw = oracleData.raw || {};
  const marketRaw = marketData.raw || {};
  const dataSourceStatus = oracle.status === "success" && isAvailable(oracleData.source) ? "CONNECTED" : "UNAVAILABLE";
  const oracleEngineStatus = oracle.status === "success" && isAvailable(oracleData.status) ? oracleData.status : "UNAVAILABLE";
  const hipStatus = market.status === "success" && isAvailable(marketData.hip3Status) ? marketData.hip3Status : "UNAVAILABLE";
  const coreStatus = market.status === "success" && isAvailable(marketRaw.hyperCoreStatus) ? marketRaw.hyperCoreStatus : "UNAVAILABLE";
  const evmStatus = market.status === "success" && isAvailable(marketRaw.hyperEvmStatus || marketRaw.hyperEVMStatus) ? (marketRaw.hyperEvmStatus || marketRaw.hyperEVMStatus) : "UNAVAILABLE";
  const hasAnyReal = [dataSourceStatus, oracleEngineStatus, hipStatus, coreStatus, evmStatus].some((value) => value !== "UNAVAILABLE");

  return `<div class="page container">
    ${pageHeader({ eyebrow: "INFRASTRUCTURE / DATA FLOW", title: "From price to", accent: "protocol", description: "A system map of how the Oracle Engine can publish a validated YPF price to HIP-3 / HyperCore and to the auditable AssetOracle / HyperEVM mirror.", meta: `${modeBadge(hasAnyReal, demoMode)} ${statusBadge(hasAnyReal ? "CONNECTED" : "UNAVAILABLE", { label: hasAnyReal ? "Partial system map" : "Unavailable" })}` })}
    ${demoMode ? emptyNotice("DEMO DATA: component statuses and displayed metrics are hardcoded for visual review only. No chain connection is being claimed.", "warning") : !hasAnyReal ? emptyNotice("Infrastructure statuses are unavailable because no backend or chain status endpoint is configured.", "warning") : ""}
    <div class="infra-hero">${renderDiagram()}<aside class="surface infra-intro"><div><span class="infra-intro__number">02</span><h2>Two delivery paths</h2><p>The Oracle Engine is the source of truth for both branches. HyperCore hosts the perpetual market path; HyperEVM mirrors the published value through AssetOracle.</p></div><div class="infra-intro__legend"><div class="legend-status"><span class="legend-status__marker"></span>Market delivery: HIP-3 → HyperCore</div><div class="legend-status"><span class="legend-status__marker legend-status__marker--amber"></span>Audit mirror: AssetOracle → HyperEVM</div></div></aside></div>
    <div class="infra-flow"><span class="infra-flow__label">Data flow</span><span class="infra-flow__path">Data912</span><span class="infra-flow__line"></span><span class="infra-flow__path">Oracle Engine</span><span class="infra-flow__line"></span><span class="infra-flow__path">HIP-3 / HyperCore</span><span class="infra-flow__line"></span><span class="infra-flow__path">AssetOracle / HyperEVM</span></div>
    <section aria-labelledby="components-title"><div class="surface__header surface__header--no-border"><div><h2 class="surface-title" id="components-title">Infrastructure components</h2><p class="surface-subtitle">Operational identity and status are separate from the market status.</p></div></div><div class="infra-cards">
      ${infrastructureCard({ className: "infra-card--source", title: "Data912", tag: "Data source", status: dataSourceStatus, items: ["YPF ADR", "YPFD BYMA", "CCL"], footer: "Oracle input", demoMode })}
      ${infrastructureCard({ className: "infra-card--engine", title: "Oracle Engine", tag: "Pricing layer", status: oracleEngineStatus, items: ["Normalization", "CCL validation", "EMA", "Circuit breaker"], footer: "Price authority", demoMode })}
      ${infrastructureCard({ className: "infra-card--core", title: "HIP-3", tag: "Hyperliquid DEX / arg", status: hipStatus, items: ["DEX: arg", "Market: YPF-PERP", "Publisher: setOracle"], footer: "Market branch", demoMode })}
      ${infrastructureCard({ className: "infra-card--core", title: "HyperCore", tag: "Perpetual market", status: coreStatus, items: ["YPF-PERP", "On-chain market", "Receives Oracle publication"], footer: "Execution layer", demoMode })}
      ${infrastructureCard({ className: "infra-card--evm", title: "HyperEVM", tag: "AssetOracle", status: evmStatus, items: ["Price mirror", "Auditable surface", "Independent EVM branch"], footer: "Mirror branch", demoMode })}
    </div></section>
  </div>`;
}
