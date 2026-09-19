export function loyaltySettlement(grossCents: number, redeem: boolean, balance: number) {
  if (!Number.isSafeInteger(grossCents) || grossCents <= 0 || grossCents > 100_000_000) throw new Error("Podaj poprawną cenę wizyty.");
  if (redeem && balance < 5) throw new Error("Do wykorzystania rabatu potrzeba 5 pieczątek.");
  const discountCents = redeem ? Math.min(Math.round(grossCents / 2), 70_000) : 0;
  return { grossCents, discountCents, paidCents: grossCents - discountCents, stamps: redeem ? -5 : grossCents > 60_000 ? 1 : 0 };
}

export function loyaltySummary(balance: number) {
  return { balance, rewards: Math.floor(Math.max(0, balance) / 5), progress: Math.max(0, balance) % 5 };
}
