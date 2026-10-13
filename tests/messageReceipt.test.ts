import { describe, expect, it } from "vitest";
import { parseMessageReceipt, messageReceiptStatus } from "../lib/messageReceipt";
const request = (data: unknown) => new Request("https://coolink.test/messages", { method: "PATCH", body: JSON.stringify(data) });
describe("truthful message receipt states", () => {
  it("distinguishes server send, recipient delivery and reading", () => { expect(messageReceiptStatus({})).toBe("sent"); expect(messageReceiptStatus({ deliveredAt: "time" })).toBe("delivered"); expect(messageReceiptStatus({ readAt: "time" })).toBe("read"); });
  it("bounds explicit recipient acknowledgement ids", async () => { expect(await parseMessageReceipt(request({ state: "delivered", ids: ["a", "a", "b"] }))).toEqual({ state: "delivered", ids: ["a", "b"] }); });
  it.each([{ state: "sent", ids: ["a"] }, { state: "read", ids: [] }, { state: "read", ids: ["../foreign"] }, { state: "read", ids: Array(201).fill("a") }])("rejects malformed acknowledgement %j", async input => { await expect(parseMessageReceipt(request(input))).rejects.toThrow(); });
  it("keeps legacy empty PATCH compatible during deployment", async () => { expect(await parseMessageReceipt(new Request("https://coolink.test/messages", { method: "PATCH" }))).toEqual({ state: "read" }); });
});
