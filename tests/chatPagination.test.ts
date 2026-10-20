import { describe, expect, it } from "vitest";
import { CHAT_PAGE_SIZE, chatBefore, chatCursor, chatPage, mergeChat } from "../lib/chatPagination";

describe("conversation history beyond 200 messages", () => {
  it("retrieves 205 messages newest first in pages, including equal timestamps", () => {
    const rows = Array.from({ length: 205 }, (_, index) => ({
      id: String(index).padStart(4, "0"), createdAt: new Date("2026-10-01T12:00:00Z"),
    })).reverse();
    const seen: string[] = [];
    let remaining = rows;
    do {
      const page = chatPage(remaining.slice(0, CHAT_PAGE_SIZE + 1));
      seen.push(...page.messages.map(message => message.id));
      if (!page.hasMore) break;
      const filter = chatBefore(new Request(`https://coolink.test/messages?${new URLSearchParams({ before: chatCursor(page.messages[0]) })}`));
      const id = filter.OR![1].id!.lt;
      remaining = rows.filter(row => row.id < id);
    } while (remaining.length);
    expect(seen).toHaveLength(205);
    expect(new Set(seen).size).toBe(205);
    expect(seen.slice(0, 50)).toEqual(rows.slice(0, 50).reverse().map(row => row.id));
    expect(seen).toContain("0204");
  });
  it.each(["null", "{}", '{"id":"x","createdAt":"invalid"}', '{"id":4,"createdAt":"2026-01-01"}', "x".repeat(513)])("rejects malformed cursor %s", value => {
    expect(() => chatBefore(new Request(`https://coolink.test/messages?${new URLSearchParams({ before: value })}`))).toThrow();
  });
  it("preserves sent messages and refreshes receipts without duplicates", () => {
    const old = { id: "1", createdAt: "2026-01-01T12:00:00Z", read: false };
    const latest = { ...old, read: true };
    expect(mergeChat([old, { ...old, id: "2" }], [latest])).toEqual([latest, { ...old, id: "2" }]);
  });
});
