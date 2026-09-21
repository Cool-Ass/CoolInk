import type { LoyaltyRules } from "@/lib/loyaltyRules";

export const LOYALTY_DESCRIPTION_KEY = "loyalty_description";
export const DEFAULT_LOYALTY_DESCRIPTION = "Jedna pieczątka za zrealizowaną i opłaconą wizytę z tatuażem powyżej {prog}, niezależnie od projektu. {pieczatki} pieczątek = {rabat}% rabatu, maksymalnie {limit}. Wizyta z nagrodą i zadatek nie dają pieczątki.";
export function renderLoyaltyDescription(template: string, rules: LoyaltyRules) {
  const money = (value: number) => (value / 100).toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
  const values: Record<string, string> = { prog: money(rules.thresholdCents), pieczatki: String(rules.stampsRequired), rabat: String(rules.discountPercent), limit: money(rules.maxDiscountCents), sesja: money(rules.sessionPriceCents) };
  return (template.trim() || DEFAULT_LOYALTY_DESCRIPTION).replace(/\{(prog|pieczatki|rabat|limit|sesja)\}/g, (_, key: string) => values[key]);
}
