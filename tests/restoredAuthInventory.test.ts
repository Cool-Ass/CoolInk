import { describe, expect, it } from "vitest";
// @ts-expect-error Executable recovery module is deliberately independent of the app runtime.
import { assertRestoredAuthInventory } from "../scripts/verifyRestoredAuth.mjs";
describe("restored Auth inventory", () => {
  it("matches every saved identity and linked client without depending on row order", () => {
    expect(() => assertRestoredAuthInventory(["a", "b"], ["b", "a"], ["b"])).not.toThrow();
  });
  it("rejects missing, substituted, duplicated, extra or empty identities", () => {
    for (const actual of [[], ["a"], ["a", "c"], ["a", "a"], ["a", "b", "c"]]) expect(() => assertRestoredAuthInventory(["a", "b"], actual, ["a"])).toThrow();
    expect(() => assertRestoredAuthInventory(["a", "b"], ["a", "b"], ["unknown"])).toThrow();
    expect(() => assertRestoredAuthInventory([], [], [])).toThrow();
  });
});
