import { describe, expect, it } from "vitest";
import { DEFAULT_LOYALTY_RULES, loyaltySettlement, loyaltySummary, validateLoyaltyRules } from "../lib/loyaltyRules";

describe("loyalty per paid tattoo visit", () => {
  it.each([[60_000, 0], [60_001, 0], [80_000, 0], [80_001, 1], [140_000, 1], [500_000, 1]])("awards stamps at %i cents", (price, stamps) => {
    expect(loyaltySettlement(price, false, 0).stamps).toBe(stamps);
  });
  it("uses configurable thresholds, reward cost, percentage and cap", () => {
    const rules = { ...DEFAULT_LOYALTY_RULES, thresholdCents: 100_000, stampsRequired: 8, discountPercent: 25, maxDiscountCents: 90_000 };
    expect(loyaltySettlement(90_000, false, 0, rules).stamps).toBe(0);
    expect(loyaltySettlement(400_000, true, 8, rules)).toEqual({ grossCents: 400_000, paidCents: 310_000, discountCents: 90_000, stamps: -8 });
    expect(loyaltySummary(18, rules)).toEqual({ balance: 18, rewards: 2, progress: 2 });
    expect(() => loyaltySettlement(140_000, true, 7, rules)).toThrow();
  });
  it.each([{ stampsRequired: 0 }, { stampsRequired: 51 }, { discountPercent: 101 }, { thresholdCents: -1 }, { sessionPriceCents: 1.2 }, { maxDiscountCents: "700" }])("rejects invalid settings %j", (change) => {
    expect(() => validateLoyaltyRules({ ...DEFAULT_LOYALTY_RULES, ...change })).toThrow();
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
