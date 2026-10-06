export type InlinePart = { text: string; style?: "bold" | "italic" | "underline" | "strike" | "code" | "highlight" };

// Text-only markup: no HTML, arbitrary links or embedded media are ever executed.
export function announcementInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|__([^_\n]+)__|~~([^~\n]+)~~|`([^`\n]+)`|==([^=\n]+)==/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    const index = match.slice(1).findIndex(value => value !== undefined);
    parts.push({ text: match[index + 1], style: (["bold", "italic", "underline", "strike", "code", "highlight"] as const)[index] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export function announcementPlainText(body: string, format?: string) {
  if (format !== "markdown") return body;
  return body.split("\n").map(line => announcementInline(line.replace(/^\s*(?:#{1,3}\s+|>\s+|[-*]\s+|\d+\.\s+)/, "")).map(part => part.text).join("")).join("\n");
}
