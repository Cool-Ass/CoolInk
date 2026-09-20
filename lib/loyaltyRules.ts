export const DEFAULT_LOYALTY_RULES = { thresholdCents: 80_000, stampsRequired: 5, discountPercent: 50, maxDiscountCents: 70_000, sessionPriceCents: 140_000 };
export type LoyaltyRules = typeof DEFAULT_LOYALTY_RULES;

export function validateLoyaltyRules(value: unknown): LoyaltyRules {
  if (!value || typeof value !== "object") throw new Error("Nieprawidłowe ustawienia programu.");
  const input = value as Record<string, unknown>;
  const rules = {} as LoyaltyRules;
  for (const key of Object.keys(DEFAULT_LOYALTY_RULES) as (keyof LoyaltyRules)[]) {
    const n = input[key];
    const max = key === "stampsRequired" ? 50 : key === "discountPercent" ? 100 : 100_000_000;
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n < (key === "thresholdCents" ? 0 : 1) || n > max) throw new Error("Sprawdź kwoty, liczbę pieczątek (1–50) i rabat (1–100%).");
    rules[key] = n;
  }
  return rules;
}

export function loyaltySettlement(grossCents: number, redeem: boolean, balance: number, rules: LoyaltyRules = DEFAULT_LOYALTY_RULES) {
  if (!Number.isSafeInteger(grossCents) || grossCents <= 0 || grossCents > 100_000_000) throw new Error("Podaj poprawną cenę wizyty.");
  if (redeem && balance < rules.stampsRequired) throw new Error(`Do wykorzystania rabatu potrzeba ${rules.stampsRequired} pieczątek.`);
  const discountCents = redeem ? Math.min(Math.round(grossCents * rules.discountPercent / 100), rules.maxDiscountCents) : 0;
  return { grossCents, discountCents, paidCents: grossCents - discountCents, stamps: redeem ? -rules.stampsRequired : grossCents > rules.thresholdCents ? 1 : 0 };
}

export function loyaltySummary(balance: number, rules: LoyaltyRules = DEFAULT_LOYALTY_RULES) {
  return { balance, rewards: Math.floor(Math.max(0, balance) / rules.stampsRequired), progress: Math.max(0, balance) % rules.stampsRequired };
}
