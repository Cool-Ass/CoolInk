import { describe, expect, it } from "vitest";
import { DEFAULT_LOYALTY_DESCRIPTION, renderLoyaltyDescription } from "../lib/loyaltyDescription";
import { DEFAULT_LOYALTY_RULES } from "../lib/loyaltyRules";

describe("loyalty description", () => {
  it("substitutes current rules without changing the template", () => {
    expect(renderLoyaltyDescription("{pieczatki} / {rabat}% / {pieczatki}", { ...DEFAULT_LOYALTY_RULES, stampsRequired: 7, discountPercent: 25 })).toBe("7 / 25% / 7");
  });
  it("uses the default for an empty description", () => {
    expect(renderLoyaltyDescription("", DEFAULT_LOYALTY_RULES)).toBe(renderLoyaltyDescription(DEFAULT_LOYALTY_DESCRIPTION, DEFAULT_LOYALTY_RULES));
  });
  it("preserves custom plain text and line breaks", () => {
    expect(renderLoyaltyDescription("Moja karta\nDziękujemy!", DEFAULT_LOYALTY_RULES)).toBe("Moja karta\nDziękujemy!");
  });
});
