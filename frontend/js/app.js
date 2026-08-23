import { icon } from "./components/common.js";

export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((slot) => {
    const name = slot.dataset.icon;
    slot.replaceChildren();
    slot.insertAdjacentHTML("beforeend", icon(name));
  });
}

export function showToast(message) {
  const toast = document.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

export function wireGlobalUI(root = document) {
  hydrateIcons(root);

  root.querySelectorAll("[data-wallet]").forEach((button) => {
    button.addEventListener("click", () => showToast("Wallet integration coming soon. No connection was attempted."));
  });

  const menuButton = root.querySelector("[data-menu]");
  const mobileNav = root.querySelector("[data-mobile-nav]");
  if (menuButton && mobileNav) {
    menuButton.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
  }
}
