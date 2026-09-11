/**
 * The editor creates only a small, readable subset of HTML. This sanitizer
 * keeps that subset and strips scripts, event handlers and arbitrary markup
 * before document content is stored or rendered for a client.
 */
const ALLOWED = new Set(["p", "div", "br", "strong", "b", "em", "i", "u", "s", "strike", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a"]);
const ALIGNED_BLOCKS = new Set(["p", "h2", "h3", "h4", "blockquote"]);

function safeTextAlign(attrs: string) {
  const style = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  const value = style?.[1] ?? style?.[2] ?? style?.[3] ?? "";
  return /(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/i.exec(value)?.[1]?.toLowerCase() ?? "";
}

export function sanitizeRichText(value: string) {
  const withoutDangerous = value
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed|svg|math)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  return withoutDangerous.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, name: string, attrs: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    const outputTag = tag === "div" ? "p" : tag;
    if (match.startsWith("</")) return `</${outputTag}>`;
    if (outputTag !== "a") {
      const alignment = ALIGNED_BLOCKS.has(outputTag) ? safeTextAlign(attrs) : "";
      return alignment ? `<${outputTag} style="text-align: ${alignment}">` : `<${outputTag}>`;
    }
    const href = /href\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1] ?? "";
    const safeHref = /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(href) ? href.replace(/"/g, "") : "";
    return safeHref ? `<a href="${safeHref}" rel="noreferrer">` : "<a>";
  });
}

export function isRichText(value: string) { return /<\/?[a-z][\s\S]*>/i.test(value); }
