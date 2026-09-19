import { describe, expect, it } from "vitest";
import { loyaltySettlement, loyaltySummary } from "../lib/loyaltyRules";

describe("loyalty per paid tattoo visit", () => {
  it.each([[60_000, 0], [60_001, 1], [140_000, 1], [500_000, 1]])("awards stamps at %i cents", (price, stamps) => {
    expect(loyaltySettlement(price, false, 0).stamps).toBe(stamps);
  });
  it.each([[80_000, 40_000], [140_000, 70_000], [280_000, 70_000], [80_001, 40_001]])("caps discount for %i cents", (price, discount) => {
    expect(loyaltySettlement(price, true, 5)).toEqual({ grossCents: price, discountCents: discount, paidCents: price - discount, stamps: -5 });
  });
  it("requires five stamps and allows saving rewards", () => {
    expect(() => loyaltySettlement(140_000, true, 4)).toThrow();
    expect(loyaltySettlement(140_000, false, 5).stamps).toBe(1);
    expect(loyaltySummary(12)).toEqual({ balance: 12, rewards: 2, progress: 2 });
  });
  it.each([0, -1, 12.5, NaN, Infinity, 100_000_001])("rejects invalid money %s", (value) => {
    expect(() => loyaltySettlement(value, false, 0)).toThrow();
  });
});
