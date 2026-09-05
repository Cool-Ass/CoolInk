const SAFE_PROTOCOLS = new Set(["https:", "mailto:", "tel:"]);

/** Keeps CMS-authored links from becoming script, protocol-relative or data URLs. */
export function safeHref(value: unknown, fallback = "#") {
  const href = String(value ?? "").trim();
  if (!href || href.startsWith("//") || /[\u0000-\u001f\u007f]/.test(href)) return fallback;
  if (href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//"))) return href;
  try {
    const parsed = new URL(href);
    return SAFE_PROTOCOLS.has(parsed.protocol) ? parsed.href : fallback;
  } catch {
    return fallback;
  }
}

export function safeMapEmbedUrl(value: unknown) {
  const href = safeHref(value, "");
  if (!href) return "";
  try {
    const url = new URL(href);
    const allowedHost = url.hostname === "www.google.com" || url.hostname === "maps.google.com";
    return allowedHost && url.pathname.startsWith("/maps/embed") ? url.href : "";
  } catch {
    return "";
  }
}
