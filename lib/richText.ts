/**
 * The editor creates only a small, readable subset of HTML. This sanitizer
 * keeps that subset and strips scripts, event handlers and arbitrary markup
 * before document content is stored or rendered for a client.
 */
const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "strike", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a"]);

export function sanitizeRichText(value: string) {
  const withoutDangerous = value
    .replace(/<\/?(?:script|style|iframe|object|embed|svg|math)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  return withoutDangerous.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, name: string, attrs: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    if (match.startsWith("</")) return `</${tag}>`;
    if (tag !== "a") return `<${tag}>`;
    const href = /href\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1] ?? "";
    const safeHref = /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(href) ? href.replace(/"/g, "") : "";
    return safeHref ? `<a href="${safeHref}" rel="noreferrer">` : "<a>";
  });
}

export function isRichText(value: string) { return /<\/?[a-z][\s\S]*>/i.test(value); }
