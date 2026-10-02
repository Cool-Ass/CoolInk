import { describe, expect, it } from "vitest";
// @ts-expect-error Executable recovery module is deliberately independent of the app runtime.
import { assertRestoredAuthInventory, authDatabase } from "../scripts/verifyRestoredAuth.mjs";
describe("restored Auth inventory", () => {
  it("uses the restored Auth migration ledger only in the disposable local database", () => {
    const url = new URL(authDatabase);
    expect(url.hostname).toBe("127.0.0.1");
    expect(url.pathname).toBe("/coolink_restore");
    expect(url.searchParams.get("options")).toBe("-c search_path=auth,extensions,public");
  });
  it("matches every saved identity and linked client without depending on row order", () => {
    expect(() => assertRestoredAuthInventory(["a", "b"], ["b", "a"], ["b"])).not.toThrow();
  });
  it("rejects missing, substituted, duplicated, extra or empty identities", () => {
    for (const actual of [[], ["a"], ["a", "c"], ["a", "a"], ["a", "b", "c"]]) expect(() => assertRestoredAuthInventory(["a", "b"], actual, ["a"])).toThrow();
    expect(() => assertRestoredAuthInventory(["a", "b"], ["a", "b"], ["unknown"])).toThrow();
    expect(() => assertRestoredAuthInventory([], [], [])).toThrow();
  });
});
