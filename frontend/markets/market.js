import { icon } from "../js/components/common.js";
import { renderMarket } from "../js/views/market.js";
import { createAppState } from "../js/state.js";
import { modeBadge, readableStatus, statusBadge } from "../js/utils.js";
import { initWDKWallet, getWDKAddress, getWDKBalance, bindWalletEvents } from "../js/wallet/connector.js";

const root = document.querySelector("#app");
const state = createAppState();

function routeFromPath(pathname) {
  if (pathname === "/oracle") return "/oracle";
  if (pathname === "/infrastructure") return "/infrastructure";
  if (pathname === "/markets" || pathname === "/") return pathname === "/markets" ? "/markets" : "/";
  return "/404";
}

function isMarketRoute(route) {
  return route === "/" || route === "/markets";
}

function renderNavigation(route) {
  const links = [
    ["/markets", "Markets"],
    ["/oracle", "Oracle"],
    ["/infrastructure", "Infrastructure"],
  ];
  return links.map(([href, label]) => `<a class="nav-link${(href === "/markets" && isMarketRoute(route)) || href === route ? " is-active" : ""}" href="${href}" data-route="${href}">${label}</a>`).join("");
}

function renderRoute(stateSnapshot) {
  if (isMarketRoute(stateSnapshot.route)) return renderMarket(stateSnapshot);
  if (stateSnapshot.route === "/oracle") return renderOracle(stateSnapshot);
  if (stateSnapshot.route === "/infrastructure") return renderInfrastructure(stateSnapshot);
  return `<div class="page container"><div class="surface"><div class="surface__body"><p class="eyebrow">404 / ROUTE NOT FOUND</p><h1 class="page-title">This route is not available.</h1><a class="button button--primary" href="/" data-route="/">Return to Market ${icon("arrow")}</a></div></div></div>`;
}

function renderFooter() {
  return `<footer class="site-footer"><div class="container footer-inner"><p class="footer-copy"><strong>AustralFinance</strong> · perpetual markets and price infrastructure for Argentine assets.</p><nav class="footer-links" aria-label="Footer navigation"><a href="/oracle" data-route="/oracle">Oracle</a><a href="/infrastructure" data-route="/infrastructure">Infrastructure</a><a href="/health" target="_blank" rel="noreferrer">Health endpoint</a></nav></div></footer>`;
}

function renderShell(snapshot) {
  const healthResource = snapshot.snapshot.health;
  const demoMode = snapshot.snapshot.mode === "simulated";
  const healthStatus = healthResource.status === "success" ? healthResource.data?.status : healthResource.status === "loading" ? "LOADING" : "UNAVAILABLE";
  const loading = snapshot.loading;
  return `<div class="app-shell">
    <header class="site-header"><div class="header-inner">
      <a class="brand" href="/" data-route="/" aria-label="AustralFinance home"><img class="brand-mark" src="../logo.png" alt="" width="34" height="34" /><span class="brand-wordmark">austral<strong>finance</strong><span class="brand-dot">.fi</span></span></a>
      <nav class="primary-nav" aria-label="Primary navigation">${renderNavigation(snapshot.route)}</nav>
      <button class="wallet-button" type="button" data-wallet>${icon("wallet")}Connect Wallet</button>
      <button class="menu-button" type="button" data-menu aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>
    </div><nav class="mobile-nav" data-mobile-nav aria-label="Mobile navigation">${renderNavigation(snapshot.route)}<button class="wallet-button" type="button" data-wallet>${icon("wallet")}Connect Wallet</button></nav></header>
    <div class="sync-strip${loading ? " is-loading" : ""}" role="status"><span class="sync-strip__label">System</span>${demoMode ? modeBadge(true, true) : statusBadge(healthStatus, { label: loading ? "Loading endpoints" : readableStatus(healthStatus), pulse: healthStatus === "CONNECTED" })}<span class="sync-strip__note">${loading ? "Preparing demo snapshot" : demoMode ? "Hardcoded visual fixture · no backend request" : snapshot.lastRefresh ? `Last refresh ${new Date(snapshot.lastRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No backend snapshot"}</span></div>
    <main class="app-main" id="main-content">${renderRoute(snapshot)}</main>
    ${renderFooter()}
    <div class="toast" data-toast role="status" aria-live="polite"></div>
  </div>`;
}

function showToast(message) {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function bindShellEvents() {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = link.getAttribute("data-route");
      if (!target) return;
      event.preventDefault();
      navigate(target);
    });
  });

  document.querySelectorAll("[data-wallet]").forEach((button) => {
    button.addEventListener("click", async () => {
      const { getWDKAddress, getWDKBalance } = await import("../js/wallet/connector.js");
      try {
        const address = await getWDKAddress();
        const balance = await getWDKBalance();
        showToast(`Wallet connected: ${address.substring(0, 6)}...${address.substring(-4)} — ${balance} USD₮`);
      } catch (error) {
        showToast("Wallet connection failed. Please try again.");
      }
    });
  });

  const menuButton = document.querySelector("[data-menu]");
  const mobileNav = document.querySelector("[data-mobile-nav]");
  if (menuButton && mobileNav) {
    menuButton.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
  }

  const marketRoot = document.querySelector(".market-page");
  if (marketRoot) {
    const { getWDKBalance } = await import("../js/wallet/connector.js");
    const balance = await getWDKBalance();
    const balanceNode = document.querySelector("[data-wdk-balance]");
    if (balanceNode) balanceNode.textContent = `${balance} USD₮`;
    enhanceMarket(marketRoot);
  }
}

function render() {
  if (!root) return;
  root.innerHTML = renderShell(state.get());
  bindShellEvents();
}

function navigate(path) {
  const normalized = routeFromPath(path);
  if (normalized === "/404") {
    history.pushState({}, "", path);
  } else {
    history.pushState({}, "", normalized);
  }
  state.setRoute(normalized);
}

window.addEventListener("popstate", () => state.setRoute(routeFromPath(window.location.pathname)));
state.subscribe(render);
state.setRoute(routeFromPath(window.location.pathname));
state.refresh();