// Runtime configuration loaded before the page module.
// Nginx proxies /api/* to the private backend; do not put a public host or secret here.
window.AUSTRAL_CONFIG = Object.freeze({
  API_URL: "/api",
});
