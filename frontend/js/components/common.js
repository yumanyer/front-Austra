import { escapeHTML, formatPrice, modeBadge, statusBadge, valueOrDash } from "../utils.js";

export function icon(name, className = "") {
  const paths = {
    arrow: '<path d="M5 12h13M13 6l6 6-6 6" />',
    arrowUp: '<path d="M5 16 12 9l4 4 5-6" /><path d="M19 7h2v2" />',
    chart: '<path d="M4 19V5M4 19h17" /><path d="m7 15 3-4 3 2 5-7" />',
    database: '<ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />',
    shield: '<path d="M12 3 19 6v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" />',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6" />',
    info: '<circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />',
    warning: '<path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v4M12 16h.01" />',
    wallet: '<path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" /><path d="M16 13h5" />',
    network: '<circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="m11 7-5 10M13 7l5 10M7 19h10" />',
    check: '<path d="m5 12 4 4L19 6" />',
    external: '<path d="M14 5h5v5M19 5l-8 8" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />',
  };
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
}

export function pageHeader({ eyebrow, title, accent = "", description, meta = "" }) {
  const titleHtml = accent ? `${escapeHTML(title)} <span class="page-title__accent">${escapeHTML(accent)}</span>` : escapeHTML(title);
  return `<header class="page-header">
    <div class="page-header__copy">
      <p class="eyebrow">${escapeHTML(eyebrow)}</p>
      <h1 class="page-title">${titleHtml}</h1>
      <p class="page-description">${escapeHTML(description)}</p>
    </div>
    ${meta ? `<div class="page-header__meta">${meta}</div>` : ""}
  </header>`;
}

export function metricCard(label, value, detail = "", formatter = String) {
  const formatted = valueOrDash(value, formatter);
  const muted = formatted === "—" ? " metric-value--muted" : "";
  return `<article class="metric-card">
    <span class="metric-label">${escapeHTML(label)}</span>
    <p class="metric-value${muted}">${escapeHTML(formatted)}</p>
    ${detail ? `<p class="metric-detail">${escapeHTML(detail)}</p>` : ""}
  </article>`;
}

export function emptyNotice(message, tone = "default") {
  return `<div class="notice${tone === "error" ? " notice--error" : tone === "warning" ? " notice--warning" : ""}" role="status">${icon(tone === "error" ? "warning" : "info")}<span>${escapeHTML(message)}</span></div>`;
}

export function sectionHeader(title, subtitle = "", badge = "", headingId = "") {
  return `<div class="surface__header">
    <div><h2 class="surface-title"${headingId ? ` id="${escapeHTML(headingId)}"` : ""}>${escapeHTML(title)}</h2>${subtitle ? `<p class="surface-subtitle">${escapeHTML(subtitle)}</p>` : ""}</div>
    ${badge}
  </div>`;
}

export function statusWithMode(status, hasRealData, label = "") {
  return `${statusBadge(status, { label: label || undefined, pulse: hasRealData })}${modeBadge(hasRealData)}`;
}

export function priceWithLabel(label, value, detail, formatter = String) {
  return `<div class="summary-metric"><span class="summary-metric__label">${escapeHTML(label)}</span><span class="summary-metric__value"><strong>${escapeHTML(valueOrDash(value, formatter))}</strong>${detail ? ` · ${escapeHTML(detail)}` : ""}</span></div>`;
}
